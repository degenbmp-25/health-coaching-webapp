import { db } from "@/lib/db"

export interface SyncPayload {
  sessionId: string
  clientId: string
  clientName: string
  date: string
  workoutName: string
  exercises: {
    name: string
    sets: {
      setNumber: number
      reps: number | null
      weight: number | null
      notes: string
    }[]
  }[]
  sessionNotes: string
}

async function getSheetConnection(trainerId: string, organizationId: string) {
  return db.sheetConnection.findUnique({
    where: {
      organizationId_trainerId: {
        organizationId,
        trainerId,
      },
    },
  })
}

async function appendToSheet(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: string[][]
) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Google Sheets API error: ${response.status} ${errorText}`)
  }

  return response.json()
}

function formatSyncPayload(session: any): SyncPayload {
  return {
    sessionId: session.id,
    clientId: session.userId,
    clientName: session.user?.name || session.user?.email || "Unknown",
    date: session.completedAt?.toISOString() || new Date().toISOString(),
    workoutName: session.workout?.name || "Unknown Workout",
    exercises: session.setLogs?.reduce((acc: any[], log: any) => {
      const exerciseName = log.workoutExercise?.exercise?.name || "Unknown"
      const existing = acc.find((e: any) => e.name === exerciseName)

      if (existing) {
        existing.sets.push({
          setNumber: log.setNumber,
          reps: log.reps,
          weight: log.weight,
          notes: "",
        })
      } else {
        acc.push({
          name: exerciseName,
          sets: [
            {
              setNumber: log.setNumber,
              reps: log.reps,
              weight: log.weight,
              notes: "",
            },
          ],
        })
      }

      return acc
    }, []) || [],
    sessionNotes: session.notes || "",
  }
}

function payloadToSheetRows(payload: SyncPayload): string[][] {
  const rows: string[][] = []

  for (const exercise of payload.exercises) {
    for (const set of exercise.sets) {
      rows.push([
        payload.date.split("T")[0],
        payload.clientName,
        payload.workoutName,
        exercise.name,
        set.setNumber.toString(),
        set.reps?.toString() || "",
        set.weight?.toString() || "",
        set.notes,
        payload.sessionId,
        payload.sessionNotes,
      ])
    }
  }

  return rows
}

function getSessionInclude() {
  return {
    user: {
      select: {
        id: true,
        name: true,
        email: true,
        primaryTrainerId: true,
      },
    },
    workout: {
      select: {
        id: true,
        name: true,
        programId: true,
        userId: true,
      },
    },
    setLogs: {
      include: {
        workoutExercise: {
          include: {
            exercise: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: [
        { workoutExerciseId: "asc" as const },
        { setNumber: "asc" as const },
      ],
    },
  }
}

// Queue a sync job (simplified - in production use a proper job queue)
export async function queueSyncJob(sessionId: string) {
  try {
    const session = await db.workoutSession.findUnique({
      where: { id: sessionId },
      include: getSessionInclude(),
    })

    if (!session) {
      throw new Error("Session not found")
    }

    if (session.status !== "completed") {
      throw new Error("Session not completed")
    }

    let trainerId = session.user.primaryTrainerId

    if (!trainerId) {
      trainerId = session.workout.userId
    }

    if (!trainerId) {
      console.log("No trainer found for sync, skipping")
      return { status: "skipped", reason: "no_trainer" }
    }

    const trainerMembership = await db.organizationMember.findFirst({
      where: { userId: trainerId },
    })

    if (!trainerMembership) {
      console.log("Trainer not in any organization, skipping sync")
      return { status: "skipped", reason: "no_organization" }
    }

    const sheetConnection = await getSheetConnection(
      trainerId,
      trainerMembership.organizationId
    )

    if (!sheetConnection) {
      console.log("No sheet connection found, skipping sync")
      return { status: "skipped", reason: "no_sheet_connection" }
    }

    const payload = formatSyncPayload(session)
    const rows = payloadToSheetRows(payload)

    if (rows.length === 0) {
      return { status: "skipped", reason: "no_data" }
    }

    // Log the sync data - actual sheet write requires OAuth token
    console.log("Would sync to sheet:", {
      sheetId: sheetConnection.sheetId,
      sheetUrl: sheetConnection.sheetUrl,
      rows: rows.length,
    })

    return {
      status: "queued",
      sheetId: sheetConnection.sheetId,
      sheetUrl: sheetConnection.sheetUrl,
      rowCount: rows.length,
    }
  } catch (error) {
    console.error("Error queuing sync job:", error)
    throw error
  }
}

// Trigger sync for a specific session with optional OAuth token
export async function triggerSync(sessionId: string, accessToken?: string) {
  try {
    const session = await db.workoutSession.findUnique({
      where: { id: sessionId },
      include: getSessionInclude(),
    })

    if (!session) {
      return { success: false, error: "Session not found" }
    }

    const payload = formatSyncPayload(session)
    const rows = payloadToSheetRows(payload)

    if (!accessToken) {
      return {
        success: true,
        synced: false,
        data: payload,
        message: "No access token provided, sync data prepared",
      }
    }

    const trainerId = session.user.primaryTrainerId || session.workout.userId

    if (!trainerId) {
      return { success: false, error: "No trainer found" }
    }

    const trainerMembership = await db.organizationMember.findFirst({
      where: { userId: trainerId },
    })

    if (!trainerMembership) {
      return { success: false, error: "Trainer not in organization" }
    }

    const sheetConnection = await getSheetConnection(
      trainerId,
      trainerMembership.organizationId
    )

    if (!sheetConnection) {
      return { success: false, error: "No sheet connection" }
    }

    await appendToSheet(
      accessToken,
      sheetConnection.sheetId,
      "A1:J1",
      rows
    )

    return {
      success: true,
      synced: true,
      sheetId: sheetConnection.sheetId,
      rowCount: rows.length,
    }
  } catch (error) {
    console.error("Error triggering sync:", error)
    return { success: false, error: String(error) }
  }
}

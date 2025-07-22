import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"

import { ActivityEditForm } from "@/components/activity/activity-edit-form"
import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"

export const metadata: Metadata = {
  title: "Student Activity Settings",
}

interface StudentActivityEditProps {
  params: { 
    studentId: string
    activityId: string 
  }
}

async function getStudentActivity(studentId: string, activityId: string, coachId: string) {
  // Verify coach has access to this student
  const student = await db.user.findUnique({
    where: { id: studentId },
    select: { coachId: true, name: true }
  })

  if (!student || student.coachId !== coachId) {
    return null
  }

  // Get the activity
  const activity = await db.activity.findUnique({
    where: {
      id: activityId,
      userId: studentId
    },
    select: {
      id: true,
      name: true,
      description: true,
      colorCode: true,
      userId: true
    }
  })

  return { activity, studentName: student.name }
}

export default async function StudentActivityEdit({ params }: StudentActivityEditProps) {
  const currentUser = await getCurrentUser()
  if (!currentUser?.id || currentUser.role !== "coach") {
    redirect("/signin")
  }

  const result = await getStudentActivity(params.studentId, params.activityId, currentUser.id)

  if (!result || !result.activity) {
    notFound()
  }

  const { activity, studentName } = result

  return (
    <Shell>
      <DashboardHeader
        heading="Activity Settings"
        text={`Modify ${studentName}'s activity details.`}
      />
      <div className="grid grid-cols-1 gap-10">
        <ActivityEditForm
          activity={{
            id: activity.id,
            name: activity.name,
            description: activity.description,
            colorCode: activity.colorCode,
          }}
        />
      </div>
    </Shell>
  )
} 
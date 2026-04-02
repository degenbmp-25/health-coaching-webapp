import { NextRequest, NextResponse } from "next/server"
import { clerkClient } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY

export async function POST(req: NextRequest) {
  try {
    // Get the current authenticated user from database
    const user = await requireAuth()

    if (user instanceof NextResponse) {
      return user
    }

    // Check if user is an owner or trainer in any organization
    const membership = await db.organizationMember.findFirst({
      where: {
        userId: user.id,
      },
      include: {
        organization: true,
      }
    })

    if (!membership || !["owner", "trainer"].includes(membership.role)) {
      return NextResponse.json({ error: "Forbidden - must be owner or trainer" }, { status: 403 })
    }

    const body = await req.json()
    const { email, password, role = "client", programId } = body

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    // Create user in Clerk using the API directly
    const clerkResponse = await fetch(`https://api.clerk.com/v1/users`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CLERK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: email,
        password: password,
        skip_password_requirements: true,
      }),
    })

    const clerkData = await clerkResponse.json()

    if (!clerkResponse.ok) {
      console.error("Clerk API error:", clerkData)
      return NextResponse.json(
        { error: clerkData.errors?.[0]?.message || "Failed to create user in Clerk" },
        { status: 400 }
      )
    }

    const clerkUserId = clerkData.id

    // Check if user already exists in our database
    const existingUser = await db.user.findFirst({
      where: { clerkId: clerkUserId }
    })

    if (existingUser) {
      return NextResponse.json({ error: "User already exists in database" }, { status: 400 })
    }

    // Create user in database
    const dbUser = await db.user.create({
      data: {
        clerkId: clerkUserId,
        email: email,
        name: email.split("@")[0],
        role: "user",
      }
    })

    // Add user to the same organization as the admin
    const orgMembership = await db.organizationMember.create({
      data: {
        userId: dbUser.id,
        organizationId: membership.organizationId,
        role: role,
      },
      include: {
        organization: true,
      }
    })

    // Optionally assign to program
    let programAssignment = null
    if (programId) {
      programAssignment = await db.programAssignment.create({
        data: {
          userId: dbUser.id,
          programId: programId,
        },
        include: {
          program: true,
        }
      })
    }

    return NextResponse.json({
      user: {
        email: dbUser.email,
        clerkId: dbUser.clerkId,
        id: dbUser.id,
      },
      organizationMembership: {
        role: orgMembership.role,
        organization: {
          name: orgMembership.organization.name,
        },
      },
      programAssignment: programAssignment ? {
        program: {
          name: programAssignment.program.name,
        },
      } : null,
    })

  } catch (error: any) {
    console.error("Error creating test user:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

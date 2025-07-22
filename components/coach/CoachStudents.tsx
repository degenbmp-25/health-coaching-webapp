"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface CoachStudentsProps {
  userId: string
}

interface Student {
  id: string
  name: string | null
  email: string | null
  image: string | null
}

export function CoachStudents({ userId }: CoachStudentsProps) {
  const { user } = useUser()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStudents() {
      try {
        setLoading(true)
        const response = await fetch(`/api/users/${userId}/students`)
        
        if (!response.ok) {
          throw new Error("Failed to fetch students")
        }
        
        const data = await response.json()
        setStudents(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchStudents()
  }, [userId])

  if (loading) {
    return <div>Loading students...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  if (students.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Students</CardTitle>
          <CardDescription>You don&apos;t have any students yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p>When users select you as their coach, they will appear here.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Students</CardTitle>
        <CardDescription>Users who have selected you as their coach</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {students.map((student) => (
            <div key={student.id} className="flex items-center space-x-4 border-b pb-3">
              <Avatar>
                <AvatarImage src={student.image || ""} alt={student.name || "Student"} />
                <AvatarFallback>{student.name?.charAt(0) || "S"}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium">{student.name}</h3>
                <p className="text-sm text-muted-foreground">{student.email}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 
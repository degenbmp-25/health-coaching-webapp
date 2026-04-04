"use client"

import { useState, useEffect, useCallback } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CoachNotesPanel } from "@/components/coach/coach-notes-panel"
import { ClientProfileCard } from "@/components/coach/client-profile-card"
import { QueryInterface } from "@/components/coach/query-interface"

interface ClientTag {
  id: string
  name: string
  color: string
}

interface ClientNote {
  id: string
  content: string
  noteType: string
  isPinned: boolean
  createdAt: string
  author?: { name: string | null; image: string | null }
  tags: ClientTag[]
}

interface ProgressData {
  recentSessions: Array<{
    id: string
    status: string
    startedAt: string
    workout: { name: string }
  }>
  programs: Array<{
    id: string
    program: { name: string; description?: string | null }
    startedAt: string
  }>
  activityStreak: { current: number; longest: number }
  recentMeals: Array<{ id: string; name: string; calories: number; date: string }>
  goals: Array<{ id: string; title: string; description?: string | null; targetDate?: string | null }>
}

interface ClientProfile {
  client: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
  progress: ProgressData
  notes: ClientNote[]
  tags: ClientTag[]
  pinnedFacts: ClientNote[]
  conversations: Array<{
    id: string
    lastMessage: string
    sentAt: string
    sender: { name: string | null }
  }>
}

interface ClientMemoryGraphProps {
  clientId: string
  clientName: string
}

/**
 * Two-column layout assembling the memory graph:
 * Left (fixed ~340px): ClientProfileCard
 * Right: Tabbed area — Notes | Query | Progress
 */
export function ClientMemoryGraph({ clientId, clientName }: ClientMemoryGraphProps) {
  const [profile, setProfile] = useState<ClientProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("notes")
  const [showQuery, setShowQuery] = useState(false)

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/profile`)
      if (!res.ok) throw new Error("Failed to load profile")
      const data = await res.json()
      setProfile(data)
    } catch (err: any) {
      setError(err.message || "Failed to load client profile")
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  if (loading) {
    return (
      <div className="flex gap-4 h-full">
        {/* Left column skeleton */}
        <div className="w-80 flex-shrink-0 space-y-3">
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
        {/* Right column skeleton */}
        <div className="flex-1 space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  if (!profile) return null

  function handleAskClick() {
    setShowQuery(true)
    setActiveTab("query")
  }

  return (
    <div className="flex gap-4 h-full min-h-0">
      {/* Left: Client profile card */}
      <div className="w-80 flex-shrink-0">
        <ClientProfileCard profile={profile} onAskClick={handleAskClick} />
      </div>

      {/* Right: Tabbed content */}
      <div className="flex-1 min-w-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid grid-cols-3 w-fit">
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="query">Query</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
          </TabsList>

          {/* Notes tab */}
          <TabsContent value="notes" className="flex-1 min-h-0 mt-3">
            <div className="h-full overflow-y-auto">
              <CoachNotesPanel clientId={clientId} clientName={clientName} />
            </div>
          </TabsContent>

          {/* Query tab */}
          <TabsContent value="query" className="flex-1 min-h-0 mt-3">
            <div className="max-w-xl">
              <QueryInterface clientId={clientId} />
            </div>
          </TabsContent>

          {/* Progress tab */}
          <TabsContent value="progress" className="flex-1 min-h-0 mt-3 overflow-y-auto">
            <ProgressView progress={profile.progress} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

/** Progress tab content */
function ProgressView({ progress }: { progress: ProgressData }) {
  const { recentSessions, programs, activityStreak, recentMeals, goals } = progress

  return (
    <div className="space-y-6">
      {/* Activity streak */}
      <div className="flex gap-4">
        <div className="p-3 border rounded-lg text-center flex-1">
          <p className="text-2xl font-bold">{activityStreak.current}</p>
          <p className="text-sm text-muted-foreground">Current Streak</p>
        </div>
        <div className="p-3 border rounded-lg text-center flex-1">
          <p className="text-2xl font-bold">{activityStreak.longest}</p>
          <p className="text-sm text-muted-foreground">Longest Streak</p>
        </div>
      </div>

      {/* Recent workouts */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Recent Workouts</h4>
        {recentSessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No workouts yet</p>
        ) : (
          <div className="space-y-1.5">
            {recentSessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-2 border rounded text-sm">
                <div>
                  <p className="font-medium">{s.workout.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.startedAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  s.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                }`}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active programs */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Active Programs</h4>
        {programs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No programs assigned</p>
        ) : (
          <div className="space-y-1.5">
            {programs.map((p) => (
              <div key={p.id} className="p-2 border rounded text-sm">
                <p className="font-medium">{p.program.name}</p>
                {p.program.description && (
                  <p className="text-xs text-muted-foreground">{p.program.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active goals */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Active Goals</h4>
        {goals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active goals</p>
        ) : (
          <div className="space-y-1.5">
            {goals.map((g) => (
              <div key={g.id} className="p-2 border rounded text-sm">
                <p className="font-medium">{g.title}</p>
                {g.description && (
                  <p className="text-xs text-muted-foreground">{g.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent meals */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Recent Meals</h4>
        {recentMeals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No meals logged</p>
        ) : (
          <div className="space-y-1.5">
            {recentMeals.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-2 border rounded text-sm">
                <div>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(m.date).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{m.calories} cal</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

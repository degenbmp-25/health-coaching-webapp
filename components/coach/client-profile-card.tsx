"use client"

import { useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { TagBadge } from "@/components/coach/tag-badge"
import { ChevronDown, ChevronUp } from "lucide-react"

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
  author?: { name: string | null }
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
    program: { name: string }
    startedAt: string
  }>
  activityStreak: { current: number; longest: number }
  recentMeals: Array<{ id: string; name: string; date: string }>
  goals: Array<{ id: string; title: string }>
}

interface ClientProfile {
  client: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
  progress: ProgressData
  tags: ClientTag[]
  pinnedFacts: ClientNote[]
  notes: ClientNote[]
  conversations: Array<{
    id: string
    lastMessage: string
    sentAt: string
    sender: { name: string | null }
  }>
}

interface ClientProfileCardProps {
  profile: ClientProfile
  onAskClick: () => void
}

/**
 * Hero card showing client key facts, pinned notes, tag cloud, and quick stats.
 */
export function ClientProfileCard({ profile, onAskClick }: ClientProfileCardProps) {
  const { client, progress, tags, pinnedFacts } = profile
  const [pinnedExpanded, setPinnedExpanded] = useState(false)

  const initials = client.name
    ? client.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : client.email[0].toUpperCase()

  const lastSession = progress.recentSessions[0]
    ? new Date(progress.recentSessions[0].startedAt).toLocaleDateString()
    : "No sessions yet"

  return (
    <div className="space-y-4">
      {/* Client header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
          {client.image ? (
            <img src={client.image} alt={client.name || ""} className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg font-semibold text-primary">{initials}</span>
          )}
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold text-lg truncate">
            {client.name || "Unknown"}
          </h2>
          <p className="text-sm text-muted-foreground truncate">{client.email}</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 border rounded text-center">
          <p className="text-lg font-bold">{progress.activityStreak.current}</p>
          <p className="text-xs text-muted-foreground">Day Streak</p>
        </div>
        <div className="p-2 border rounded text-center">
          <p className="text-lg font-bold">{progress.programs.length}</p>
          <p className="text-xs text-muted-foreground">Programs</p>
        </div>
        <div className="p-2 border rounded text-center">
          <p className="text-xs font-medium truncate">{lastSession}</p>
          <p className="text-xs text-muted-foreground">Last Session</p>
        </div>
      </div>

      {/* Pinned facts */}
      {pinnedFacts.length > 0 && (
        <div>
          <button
            onClick={() => setPinnedExpanded(!pinnedExpanded)}
            className="flex items-center gap-1 text-sm font-medium mb-1.5 hover:text-foreground transition-colors w-full"
          >
            <span className="text-amber-500">★</span>
            Pinned Facts ({pinnedFacts.length})
            {pinnedExpanded ? (
              <ChevronUp className="w-4 h-4 ml-auto" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-auto" />
            )}
          </button>

          {pinnedExpanded && (
            <div className="space-y-1.5">
              {pinnedFacts.map((note) => (
                <div
                  key={note.id}
                  className="p-2 border border-amber-200 bg-amber-50 rounded text-xs"
                >
                  <p className="font-medium mb-0.5">
                    {note.noteType.replace("_", " ")}
                  </p>
                  <p className="text-muted-foreground leading-relaxed line-clamp-2">
                    {note.content}
                  </p>
                  {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {note.tags.map((tag) => (
                        <TagBadge key={tag.id} tag={tag} size="sm" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tag cloud */}
      {tags.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-1.5">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} size="sm" />
            ))}
          </div>
        </div>
      )}

      {/* Ask button */}
      <button
        onClick={onAskClick}
        className="w-full py-2 px-3 border border-dashed border-muted-foreground/30 rounded-lg text-sm text-muted-foreground hover:border-muted-foreground/60 hover:text-foreground transition-colors"
      >
        Ask about this client...
      </button>
    </div>
  )
}

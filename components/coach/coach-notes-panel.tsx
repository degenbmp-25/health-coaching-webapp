"use client"

import { useState, useEffect, useCallback } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PinIcon, ChevronDown, ChevronUp } from "lucide-react"
import { TagBadge } from "@/components/coach/tag-badge"
import { NoteEditor } from "@/components/coach/note-editor"

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
  updatedAt: string
  author: { id: string; name: string | null; image: string | null }
  tags: ClientTag[]
}

interface CoachNotesPanelProps {
  clientId: string
  clientName: string
}

/** Time ago helper */
function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return date.toLocaleDateString()
}

/** Group notes by date */
function groupByDate(notes: ClientNote[]): Record<string, ClientNote[]> {
  return notes.reduce((acc, note) => {
    const dateKey = new Date(note.createdAt).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(note)
    return acc
  }, {} as Record<string, ClientNote[]>)
}

const TYPE_LABELS: Record<string, string> = {
  general: "General",
  injury: "Injury",
  observation: "Observation",
  goal_update: "Goal Update",
  concern: "Concern",
}

const TYPE_COLORS: Record<string, string> = {
  general: "bg-gray-100 text-gray-700",
  injury: "bg-red-100 text-red-700",
  observation: "bg-blue-100 text-blue-700",
  goal_update: "bg-green-100 text-green-700",
  concern: "bg-amber-100 text-amber-700",
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "injury", label: "Injury" },
  { value: "concern", label: "Concern" },
  { value: "observation", label: "Observation" },
  { value: "pinned", label: "Pinned" },
] as const

/**
 * Coach notes sidebar panel.
 * Scrollable note list, grouped by date, with filter pills and inline note creation.
 */
export function CoachNotesPanel({ clientId, clientName }: CoachNotesPanelProps) {
  const { toast } = useToast()
  const [notes, setNotes] = useState<ClientNote[]>([])
  const [allTags, setAllTags] = useState<ClientTag[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const [showEditor, setShowEditor] = useState(false)
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null)
  const [editingNote, setEditingNote] = useState<ClientNote | null>(null)

  const fetchTags = useCallback(async () => {
    const res = await fetch(`/api/clients/${clientId}/tags`)
    if (res.ok) {
      const data = await res.json()
      setAllTags(data)
    }
  }, [clientId])

  const fetchNotes = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/clients/${clientId}/notes?limit=50`)
    if (res.ok) {
      const data = await res.json()
      setNotes(data.notes)
    }
    setLoading(false)
  }, [clientId])

  useEffect(() => {
    fetchNotes()
    fetchTags()
  }, [fetchNotes, fetchTags])

  const filteredNotes = notes.filter((n) => {
    if (filter === "all") return true
    if (filter === "pinned") return n.isPinned
    return n.noteType === filter
  })

  const groupedNotes = groupByDate(filteredNotes)

  function handleSaved() {
    setShowEditor(false)
    setEditingNote(null)
    setExpandedNoteId(null)
    fetchNotes()
    fetchTags()
    toast({ title: "Note saved" })
  }

  function handleCancel() {
    setShowEditor(false)
    setEditingNote(null)
    setExpandedNoteId(null)
  }

  async function handleDelete(noteId: string) {
    if (!confirm("Delete this note?")) return
    const res = await fetch(`/api/clients/${clientId}/notes/${noteId}`, {
      method: "DELETE",
    })
    if (res.ok) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
      toast({ title: "Note deleted" })
    } else {
      toast({ title: "Failed to delete note", variant: "destructive" })
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Coach Notes</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowEditor(!showEditor)}
        >
          {showEditor ? "Cancel" : "+ Add Note"}
        </Button>
      </div>

      {/* Note editor inline */}
      {showEditor && (
        <div className="mb-3">
          <NoteEditor
            clientId={clientId}
            existingTags={allTags}
            onSave={handleSaved}
            onCancel={handleCancel}
          />
        </div>
      )}

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1 mb-3">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
              filter === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-muted-foreground/20 hover:border-muted-foreground/50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
        {loading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-16 w-full rounded" />
              </div>
            ))}
          </>
        ) : filteredNotes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No notes yet
          </p>
        ) : (
          Object.entries(groupedNotes).map(([date, dateNotes]) => (
            <div key={date}>
              {/* Date header */}
              <p className="text-xs font-medium text-muted-foreground mb-1.5 sticky top-0 bg-background z-10 py-0.5">
                {date}
              </p>

              {/* Notes for this date */}
              <div className="space-y-2">
                {dateNotes.map((note) => (
                  <div
                    key={note.id}
                    className={`p-3 border rounded-lg text-sm transition-colors ${
                      note.isPinned ? "bg-amber-50 border-amber-200" : "bg-card"
                    }`}
                  >
                    {/* Note header row */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        {/* Avatar */}
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                          {note.author.image ? (
                            <img
                              src={note.author.image}
                              alt={note.author.name || ""}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs">
                              {note.author.name?.[0] || "?"}
                            </span>
                          )}
                        </div>
                        {/* Type badge */}
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${TYPE_COLORS[note.noteType] || TYPE_COLORS.general}`}
                        >
                          {TYPE_LABELS[note.noteType] || note.noteType}
                        </span>
                        {/* Pin indicator */}
                        {note.isPinned && (
                          <PinIcon className="w-3 h-3 text-amber-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(note.createdAt)}
                        </span>
                        {/* Expand/collapse */}
                        <button
                          onClick={() =>
                            setExpandedNoteId(
                              expandedNoteId === note.id ? null : note.id
                            )
                          }
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {expandedNoteId === note.id ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <p
                      className={`text-sm leading-relaxed ${expandedNoteId === note.id ? "" : "line-clamp-2"}`}
                    >
                      {note.content}
                    </p>

                    {/* Tags */}
                    {note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {note.tags.map((tag) => (
                          <TagBadge key={tag.id} tag={tag} size="sm" />
                        ))}
                      </div>
                    )}

                    {/* Expanded actions */}
                    {expandedNoteId === note.id && (
                      <div className="flex gap-2 mt-2 pt-2 border-t">
                        <button
                          onClick={() => {
                            setEditingNote(note)
                            setShowEditor(true)
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(note.id)}
                          className="text-xs text-destructive hover:text-destructive/80"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

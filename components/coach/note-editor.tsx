"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { TagBadge } from "@/components/coach/tag-badge"

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
  tags: ClientTag[]
  author?: { id: string; name: string | null; image: string | null }
  createdAt?: string
  updatedAt?: string
}

const NOTE_TYPES = [
  { value: "general", label: "General" },
  { value: "injury", label: "Injury" },
  { value: "observation", label: "Observation" },
  { value: "goal_update", label: "Goal Update" },
  { value: "concern", label: "Concern" },
] as const

interface NoteEditorProps {
  clientId: string
  note?: ClientNote
  existingTags: ClientTag[]
  onSave: () => void
  onCancel: () => void
}

/**
 * Note creation/editing form.
 * Textarea, note type selector, tag multi-select, pin toggle, save/cancel.
 */
export function NoteEditor({
  clientId,
  note,
  existingTags,
  onSave,
  onCancel,
}: NoteEditorProps) {
  const [content, setContent] = useState(note?.content || "")
  const [noteType, setNoteType] = useState<string>(note?.noteType || "general")
  const [isPinned, setIsPinned] = useState(note?.isPinned || false)
  const [selectedTags, setSelectedTags] = useState<ClientTag[]>(note?.tags || [])
  const [tagInput, setTagInput] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const isEditing = Boolean(note)

  function toggleTag(tag: ClientTag) {
    setSelectedTags((prev) =>
      prev.find((t) => t.id === tag.id)
        ? prev.filter((t) => t.id !== tag.id)
        : [...prev, tag]
    )
  }

  async function handleSave() {
    if (!content.trim()) {
      setError("Note content is required.")
      return
    }
    if (content.length > 5000) {
      setError("Note content must be 5000 characters or fewer.")
      return
    }

    setSaving(true)
    setError("")

    const tagNames = selectedTags.map((t) => t.name)

    try {
      const url = isEditing
        ? `/api/clients/${clientId}/notes/${note!.id}`
        : `/api/clients/${clientId}/notes`

      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, noteType, isPinned, tags: tagNames }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Failed to save note")
      }

      onSave()
    } catch (err: any) {
      setError(err.message || "Failed to save note")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-card">
      {/* Content textarea */}
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your observation about this client..."
        rows={4}
        maxLength={5000}
        className="resize-none"
        disabled={saving}
      />

      {/* Char count */}
      <div className="text-xs text-muted-foreground text-right">
        {content.length}/5000
      </div>

      {/* Note type selector */}
      <div className="space-y-1">
        <p className="text-sm font-medium">Type</p>
        <div className="flex flex-wrap gap-2">
          {NOTE_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setNoteType(type.value)}
              disabled={saving}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                noteType === type.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-muted-foreground/20 hover:border-muted-foreground/50"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tag multi-select */}
      <div className="space-y-1">
        <p className="text-sm font-medium">Tags</p>

        {/* Selected tags */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {selectedTags.map((tag) => (
              <TagBadge
                key={tag.id}
                tag={tag}
                size="sm"
                onRemove={() => toggleTag(tag)}
              />
            ))}
          </div>
        )}

        {/* Existing tag picker */}
        {existingTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {existingTags
              .filter((t) => !selectedTags.find((s) => s.id === t.id))
              .map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  disabled={saving}
                  className="px-2 py-0.5 rounded-full text-xs border border-dashed border-muted-foreground/30 hover:border-muted-foreground/60 transition-colors"
                >
                  + {tag.name}
                </button>
              ))}
          </div>
        )}

        {/* Type to create new tag */}
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && tagInput.trim()) {
              e.preventDefault()
              const name = tagInput.trim()
              if (!selectedTags.find((t) => t.name === name)) {
                // Deterministic color matching server-side logic
                const colorPalette = [
                  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
                  "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#f59e0b",
                ]
                const colorIdx = name.split("").reduce(
                  (acc, ch) => (acc * 31 + ch.charCodeAt(0)) & 0xffffffff,
                  0
                ) % colorPalette.length
                setSelectedTags([
                  ...selectedTags,
                  { id: `new-${name}`, name, color: colorPalette[colorIdx] },
                ])
              }
              setTagInput("")
            }
          }}
          placeholder="Type to create a new tag (press Enter)"
          disabled={saving}
          className="w-full mt-1 px-2 py-1 text-sm border rounded bg-background"
        />
      </div>

      {/* Pin toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsPinned(!isPinned)}
          disabled={saving}
          className={`text-sm transition-colors ${
            isPinned ? "text-amber-500 font-medium" : "text-muted-foreground"
          }`}
        >
          {isPinned ? "★ Pinned" : "☆ Pin note"}
        </button>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? "Saving..." : isEditing ? "Update Note" : "Save Note"}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={saving} size="sm">
          Cancel
        </Button>
      </div>
    </div>
  )
}

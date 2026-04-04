"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { SendIcon } from "lucide-react"

interface QueryInterfaceProps {
  clientId: string
}

/**
 * Natural-language-style query interface.
 * Single input field → answer displayed as styled card below.
 */
export function QueryInterface({ clientId }: QueryInterfaceProps) {
  const [query, setQuery] = useState("")
  const [answer, setAnswer] = useState<string | null>(null)
  const [sources, setSources] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError("")
    setAnswer(null)

    try {
      const res = await fetch(
        `/api/clients/${clientId}/query?q=${encodeURIComponent(query)}`
      )
      if (!res.ok) throw new Error("Query failed")
      const data = await res.json()
      setAnswer(data.answer)
      setSources(data.sources || [])
    } catch (err) {
      setError("Failed to get an answer. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const SOURCE_LABELS: Record<string, string> = {
    workout_sessions: "Workouts",
    goals: "Goals",
    client_notes: "Notes",
    meals: "Meals",
    conversations: "Messages",
  }

  return (
    <div className="space-y-3">
      {/* Query input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask about this client (e.g. How is Kevin progressing?)"
          disabled={loading}
          className="flex-1"
        />
        <Button type="submit" disabled={loading || !query.trim()} size="sm">
          <SendIcon className="w-4 h-4" />
        </Button>
      </form>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive p-3 border border-destructive/20 rounded bg-destructive/5">
          {error}
        </p>
      )}

      {/* Answer card */}
      {answer && !loading && (
        <div className="p-3 border rounded-lg bg-card space-y-2">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {answer}
          </p>
          {sources.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1 border-t">
              <span className="text-xs text-muted-foreground mr-1">Sources:</span>
              {sources.map((s) => (
                <span
                  key={s}
                  className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                >
                  {SOURCE_LABELS[s] || s}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!answer && !loading && !error && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Ask about progress, injuries, goals, concerns, or recent activity.
        </p>
      )}
    </div>
  )
}

"use client"

import { X } from "lucide-react"

interface ClientTag {
  id: string
  name: string
  color: string
}

interface TagBadgeProps {
  tag: ClientTag
  size?: "sm" | "md"
  onRemove?: () => void
}

/**
 * Colored tag pill with optional remove button.
 * Sizes: sm (text-xs) / md (text-sm)
 */
export function TagBadge({ tag, size = "md", onRemove }: TagBadgeProps) {
  const sizeClasses = size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1"

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses}`}
      style={{
        backgroundColor: `${tag.color}20`,
        color: tag.color,
        border: `1px solid ${tag.color}40`,
      }}
    >
      {/* Colored dot */}
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: tag.color }}
      />
      {tag.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-0.5 hover:opacity-70 transition-opacity"
          aria-label={`Remove tag ${tag.name}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}

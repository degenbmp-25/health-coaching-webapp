"use client"

import { UserButton } from "@clerk/nextjs"

export function UserAccountNav() {
  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: "h-8 w-8",
          userButtonPopoverCard: "bg-card border border-border shadow-md",
          userButtonPopoverFooter: "bg-card",
          userButtonPopoverActions: "bg-card",
          userButtonPopoverActionButton: "text-foreground hover:bg-accent hover:text-accent-foreground",
          userButtonPopoverActionButtonText: "text-foreground",
          userButtonPopoverActionButtonIcon: "text-muted-foreground",
          userPreviewMainIdentifier: "text-foreground",
          userPreviewSecondaryIdentifier: "text-muted-foreground",
          userPreviewAvatarBox: "border-border",
          userPreviewTextContainer: "text-foreground",
        },
      }}
      userProfileMode="navigation"
      userProfileUrl="/dashboard/settings"
      afterSignOutUrl="/"
    />
  )
}

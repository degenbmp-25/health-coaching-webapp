"use client"

import * as React from "react"
import { SignInButton, SignUpButton } from "@clerk/nextjs"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Icons } from "@/components/icons"

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "signin" | "signup"
}

export function UserAuthForm({ className, type = "signin", ...props }: UserAuthFormProps) {
  const isSignIn = type === "signin"

  return (
    <div className={cn("grid gap-2", className)} {...props}>
      {isSignIn ? (
        <SignInButton mode="modal">
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <Icons.user className="mr-2 h-4 w-4" />
            Sign in to your account
          </button>
        </SignInButton>
      ) : (
        <SignUpButton mode="modal">
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <Icons.user className="mr-2 h-4 w-4" />
            Create your account
          </button>
        </SignUpButton>
      )}
    </div>
  )
}

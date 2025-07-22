import Link from "next/link"
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

import { UserAccountNav } from "./user-account-nav"

export function UserNavDisplay() {
  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <button className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Sign in
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserAccountNav />
      </SignedIn>
    </>
  )
}

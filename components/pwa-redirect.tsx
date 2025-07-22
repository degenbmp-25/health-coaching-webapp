"use client"

import * as React from "react"
import { redirect } from "next/navigation"
import { useAuth } from "@clerk/nextjs"

export function PWARedirect() {
  const { isSignedIn, isLoaded } = useAuth()

  React.useEffect(() => {
    if (isLoaded && window.matchMedia("(display-mode: standalone)").matches) {
      if (isSignedIn) {
        redirect("/dashboard")
      } else {
        redirect("/signin")
      }
    }
  }, [isLoaded, isSignedIn])

  return null
}

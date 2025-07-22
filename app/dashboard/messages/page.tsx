import { Metadata } from "next"
import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/session"
import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { MessagesContainer } from "@/components/messages/messages-container"

export const metadata: Metadata = {
  title: "Messages",
  description: "Message with other users.",
}

export default async function MessagesPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/signin")
  }

  return (
    <Shell>
      <DashboardHeader 
        heading="Messages" 
        text="Chat with other users."
      />
      <MessagesContainer />
    </Shell>
  )
} 
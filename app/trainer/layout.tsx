import { ReactNode } from "react"

import Footer from "@/components/layout/footer"
import { MobileSectionBar } from "@/components/layout/mobile-section-bar"
import Navbar from "@/components/layout/navbar"
import { DashboardNav } from "@/components/pages/dashboard/dashboard-nav"
import { dashboardLinks, trainerLinks } from "@/config/links"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

interface TrainerLayoutProps {
  children: ReactNode
}

export default async function TrainerLayout({ children }: TrainerLayoutProps) {
  const user = await getCurrentUser()

  let canAccessTrainer = false
  if (user) {
    try {
      const membership = await db.organizationMember.findFirst({
        where: {
          userId: user.id,
          role: { in: ["owner", "trainer", "coach"] },
        },
        select: { role: true },
      })
      // Also check User.role for coach access
      const dbUser = await db.user.findUnique({
        where: { id: user.id },
        select: { role: true }
      })
      canAccessTrainer = Boolean(membership) || dbUser?.role === 'coach'
    } catch (error) {
      console.error("Error checking trainer access:", error)
      canAccessTrainer = false
    }
  }

  const mobileLinks = canAccessTrainer
    ? [...dashboardLinks.data, ...trainerLinks.data]
    : dashboardLinks.data

  return (
    <div className="flex min-h-screen min-w-0 flex-col">
      <Navbar />
      <MobileSectionBar items={mobileLinks} title="Trainer" />
      <div className="container mt-4 grid w-full max-w-full min-w-0 flex-1 grid-cols-1 gap-4 !px-0 md:mt-6 md:gap-12 md:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="hidden w-[200px] flex-col md:flex">
          <DashboardNav items={dashboardLinks.data} />
          {canAccessTrainer && (
            <div className="mt-6 border-t pt-6">
              <p className="mb-2 px-3 text-xs font-semibold text-muted-foreground">TRAINER</p>
              <DashboardNav items={trainerLinks.data} />
            </div>
          )}
        </aside>
        <main className="relative flex w-full min-w-0 flex-1 flex-col">
          {children}
        </main>
      </div>
      <div className="mt-6">
        <Footer />
      </div>
    </div>
  )
}

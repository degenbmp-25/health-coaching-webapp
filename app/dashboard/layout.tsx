import { dashboardLinks, trainerLinks } from "@/config/links"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import Footer from "@/components/layout/footer"
import Navbar from "@/components/layout/navbar"
import { DashboardNav } from "@/components/pages/dashboard/dashboard-nav"
import { MobileNav } from "@/components/layout/mobile-nav"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const user = await getCurrentUser()
  
  // Check if user can access trainer section (owner or trainer role)
  let canAccessTrainer = false
  if (user) {
    try {
      // CRITICAL FIX: user.id from Clerk is Clerk ID (user_xxx), but OrgMember.userId is DB CUID
      // Must resolve Clerk ID -> DB user first
      const dbUser = await db.user.findFirst({
        where: { clerkId: user.id },
        select: { id: true, role: true }
      })
      
      const membership = dbUser ? await db.organizationMember.findFirst({
        where: {
          userId: dbUser.id,  // Use DB CUID
          role: { in: ["owner", "trainer", "coach"] },
        },
        select: { role: true },
      }) : null
      
      canAccessTrainer = Boolean(membership) || dbUser?.role === 'coach'
    } catch (error) {
      console.error("Error checking trainer access:", error)
      canAccessTrainer = false
    }
  }

  // Combine links for mobile nav
  const mobileLinks = canAccessTrainer 
    ? [...dashboardLinks.data, ...trainerLinks.data]
    : dashboardLinks.data

  return (
    <div className="flex min-h-screen flex-col space-y-6">
      <Navbar />
      <div className="container grid flex-1 gap-4 md:gap-12 md:grid-cols-[200px_1fr]">
        <aside className="hidden w-[200px] flex-col md:flex">
          <DashboardNav items={dashboardLinks.data} />
          {canAccessTrainer && (
            <div className="mt-6 pt-6 border-t">
              <p className="px-3 text-xs font-semibold text-muted-foreground mb-2">TRAINER</p>
              <DashboardNav items={trainerLinks.data} />
            </div>
          )}
        </aside>
        <main className="flex w-full flex-1 flex-col relative">
          <div className="fixed top-20 left-4 z-50 md:hidden">
            <MobileNav items={mobileLinks} />
          </div>
          {children}
        </main>
      </div>
      <Footer />
    </div>
  )
}

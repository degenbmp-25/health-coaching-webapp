import { dashboardLinks, trainerLinks } from "@/config/links"
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
  // TEMP FOR DEMO: Always show trainer links in mobile nav
  const mobileLinks = [...dashboardLinks.data, ...trainerLinks.data]

  return (
    <div className="flex min-h-screen flex-col space-y-6 px-4">
      <Navbar />
      {/* Desktop: sidebar + content in grid. Mobile: sidebar hidden, content centered */}
      <div className="flex flex-col flex-1 gap-4 md:gap-12">
        {/* Sidebar: fixed position on desktop */}
        <aside className="hidden md:block w-[200px] shrink-0 self-start sticky top-4 h-fit flex-col">
          <DashboardNav items={dashboardLinks.data} />
        </aside>
        {/* Main content: full width centered on mobile, takes remaining space on desktop */}
        <main className="flex w-full flex-1 flex-col relative">
          {/* Mobile hamburger nav - only visible on mobile */}
          <div className="fixed top-20 left-4 z-50 md:hidden">
            <MobileNav items={mobileLinks} />
          </div>
          <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-0">
            {children}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  )
}

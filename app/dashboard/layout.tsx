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
    <div className="flex min-h-screen flex-col space-y-6">
      <Navbar />
      {/* Desktop: sidebar + content in grid. Mobile: content only, centered */}
      <div className="container flex flex-1 gap-4 md:gap-12">
        {/* Sidebar: hidden on mobile (<768px), visible on desktop */}
        <aside className="hidden md:flex w-[200px] flex-col">
          <DashboardNav items={dashboardLinks.data} />
        </aside>
        {/* Main content: full width on mobile, takes remaining space on desktop */}
        <main className="flex w-full flex-1 flex-col relative max-w-7xl mx-auto">
          {/* Mobile hamburger nav - only visible on mobile */}
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

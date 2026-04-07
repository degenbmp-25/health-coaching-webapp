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
      {/* Content area: full width on mobile, sidebar overlaps on desktop */}
      <div className="relative flex flex-1">
        {/* Sidebar: absolute on desktop, hidden on mobile */}
        <aside className="absolute left-0 top-0 hidden lg:block w-[200px] h-full">
          <DashboardNav items={dashboardLinks.data} />
        </aside>
        {/* Main content: full width on mobile, indented on desktop */}
        <main className="flex w-full flex-1 flex-col relative">
          {/* Mobile hamburger nav */}
          <div className="fixed top-20 left-4 z-50 lg:hidden">
            <MobileNav items={mobileLinks} />
          </div>
          <div className="lg:pl-[216px] px-4">
            {children}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  )
}

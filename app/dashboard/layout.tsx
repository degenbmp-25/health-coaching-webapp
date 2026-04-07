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
    <div className="flex min-h-screen flex-col">
      <Navbar />
      
      {/* DESKTOP ONLY: Fixed sidebar that overlays content */}
      <aside className="fixed left-0 top-16 bottom-0 w-[200px] z-30 hidden lg:block">
        <DashboardNav items={dashboardLinks.data} />
      </aside>
      
      {/* Main content: full width on mobile */}
      <main className="flex-1 flex flex-col relative">
        {/* Mobile hamburger nav */}
        <div className="fixed top-20 left-4 z-50 lg:hidden">
          <MobileNav items={mobileLinks} />
        </div>
        
        {/* Content: full width on mobile, indented on desktop */}
        <div className="w-full px-4 lg:pl-[216px]">
          {children}
        </div>
      </main>
      
      <Footer />
    </div>
  )
}

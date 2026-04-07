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
      <div className="container grid flex-1 gap-4 md:gap-12 md:grid-cols-[200px_1fr]">
        <aside className="hidden w-[200px] flex-col md:flex">
          <DashboardNav items={dashboardLinks.data} />
        </aside>
        <main className="flex w-full flex-1 flex-col relative max-w-7xl mx-auto">
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

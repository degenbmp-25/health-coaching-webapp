import Footer from "@/components/layout/footer"
import Navbar from "@/components/layout/navbar"

interface FrontPageLayoutProps {
  children: React.ReactNode
}

export default function FrontPageLayout({
  children,
}: FrontPageLayoutProps) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  )
}

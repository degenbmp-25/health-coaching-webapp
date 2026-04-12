"use client"

import { useState } from "react"
import Link from "next/link"
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { navLinks } from "@/config/links"
import { siteConfig } from "@/config/site"
import { UserNavDisplay } from "@/components/user/user-nav-display"
import { Button } from "@/components/ui/button"

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container flex h-16 items-center justify-between !px-4 sm:!px-6 lg:!px-8">
        {/* Logo */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {siteConfig.name}
            </span>
          </Link>
        </div>

        {/* Navigation Links - Desktop */}
        <div className="hidden md:flex items-center space-x-8">
          {navLinks.data.map((item, index) => (
            item.href && (
              <Link
                key={index}
                href={item.disabled ? "/" : item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  "relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full",
                  item.disabled && "cursor-not-allowed opacity-50"
                )}
              >
                {item.title}
              </Link>
            )
          ))}
        </div>

        {/* CTA Section - Desktop */}
        <div className="hidden md:flex items-center space-x-4">
          <SignedOut>
            <Link
              href="/signin"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Sign In
            </Link>
            <Link
              href="/signin"
              className={cn(buttonVariants({ size: "sm" }), "bg-primary hover:bg-primary/90 text-primary-foreground font-semibold")}
            >
              Get Started
            </Link>
          </SignedOut>
          <SignedIn>
            <UserNavDisplay />
          </SignedIn>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center space-x-4">
          <SignedOut>
            <SignInButton mode="modal">
              <button className={cn(buttonVariants({ size: "sm" }), "bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-3")}>
                Get Started
              </button>
            </SignInButton>
          </SignedOut>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="h-8 w-8 p-0"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
          <SignedIn>
            <UserNavDisplay />
          </SignedIn>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b bg-background">
          <div className="container py-4 space-y-4 !px-4 sm:!px-6 lg:!px-8">
            {navLinks.data.map((item, index) => (
              item.href && (
                <Link
                  key={index}
                  href={item.disabled ? "/" : item.href}
                  className="block py-2 text-sm font-medium hover:text-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.title}
                </Link>
              )
            ))}
            <SignedOut>
              <div className="pt-4 border-t space-y-3">
                <Link
                  href="/signin"
                  className="block py-2 text-sm font-medium hover:text-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <SignInButton mode="modal">
                  <button 
                    className={cn(buttonVariants({ size: "sm" }), "w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold")}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Get Started
                  </button>
                </SignInButton>
              </div>
            </SignedOut>
          </div>
        </div>
      )}
    </header>
  )
}

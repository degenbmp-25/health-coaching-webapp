"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { NavItem } from "@/types"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Icons } from "@/components/icons"

interface MobileNavProps {
  items: NavItem[]
}

export function MobileNav({ items }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="md:hidden">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="w-80 max-w-80 p-0 left-4 translate-x-0">
          <div className="flex flex-col h-full max-h-[80vh]">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Navigation</h2>
            </div>
            <nav className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-2">
                {items.map((item, index) => {
                  const Icon = Icons[item.icon || "next"]
                  return (
                    item.href && (
                      <Link
                        key={index}
                        href={item.disabled ? "/" : item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          pathname === item.href 
                            ? "bg-accent text-accent-foreground" 
                            : "text-muted-foreground",
                          item.disabled && "cursor-not-allowed opacity-60"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </Link>
                    )
                  )
                })}
              </div>
            </nav>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 
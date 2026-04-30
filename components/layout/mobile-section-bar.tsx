import { NavItem } from "@/types"

import { MobileNav } from "@/components/layout/mobile-nav"

interface MobileSectionBarProps {
  items: NavItem[]
  title: string
}

export function MobileSectionBar({ items, title }: MobileSectionBarProps) {
  return (
    <div className="sticky top-16 z-40 border-b bg-background/95 backdrop-blur md:hidden">
      <div className="container flex h-12 items-center gap-3 !px-4 sm:!px-6 lg:!px-8">
        <MobileNav items={items} />
        <span className="min-w-0 truncate text-sm font-medium text-muted-foreground">
          {title}
        </span>
      </div>
    </div>
  )
}

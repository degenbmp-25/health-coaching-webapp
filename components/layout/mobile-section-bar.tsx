import { NavItem } from "@/types"
import { MobileNav } from "@/components/layout/mobile-nav"

interface MobileSectionBarProps {
  items: NavItem[]
  label?: string
}

export function MobileSectionBar({ items, label }: MobileSectionBarProps) {
  return (
    <div className="sticky top-16 z-40 -mt-6 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex h-12 items-center gap-3 px-4 sm:px-6">
        <MobileNav items={items} />
        {label ? (
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
        ) : null}
      </div>
    </div>
  )
}

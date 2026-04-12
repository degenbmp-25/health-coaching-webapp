import * as React from "react"

import { cn } from "@/lib/utils"

interface ShellProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Shell({ children, className, ...props }: ShellProps) {
  return (
    <div className={cn("mx-auto grid w-full max-w-full min-w-0 grid-cols-1 items-start gap-4 px-0 pt-20 sm:gap-6 md:gap-8 md:pt-0", className)} {...props}>
      {children}
    </div>
  )
}

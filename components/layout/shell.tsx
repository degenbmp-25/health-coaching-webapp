import * as React from "react"

import { cn } from "@/lib/utils"

interface ShellProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Shell({ children, className, ...props }: ShellProps) {
  return (
    <div className={cn("mx-auto grid w-full max-w-full min-w-0 items-start gap-4 px-4 sm:gap-6 sm:px-6 md:gap-8 lg:px-8", className)} {...props}>
      {children}
    </div>
  )
}

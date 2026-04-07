import * as React from "react"

import { cn } from "@/lib/utils"

interface ShellProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Shell({ children, className, ...props }: ShellProps) {
  return (
    <div className={cn("grid items-start gap-4 sm:gap-6 md:gap-8 px-4 sm:px-6 lg:px-0 mx-auto w-full max-w-7xl min-w-0", className)} {...props}>
      {children}
    </div>
  )
}

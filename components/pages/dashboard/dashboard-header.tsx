interface DashboardHeaderProps {
  heading: string
  text?: string | null
  children?: React.ReactNode
}

export function DashboardHeader({
  heading,
  text,
  children,
}: DashboardHeaderProps) {
  return (
    <div className="flex w-full min-w-0 flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
      <div className="grid min-w-0 gap-1">
        <h1 className="break-words text-2xl font-bold md:text-3xl">{heading}</h1>
        {text && <p className="break-words text-base text-muted-foreground sm:text-lg">{text}</p>}
      </div>
      {children ? <div className="flex w-full min-w-0 flex-col items-stretch gap-2 sm:w-auto sm:items-end">{children}</div> : null}
    </div>
  )
}

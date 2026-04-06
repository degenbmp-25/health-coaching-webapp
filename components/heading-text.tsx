interface HeadingProps {
  children: string
  subtext?: string
  className?: string
}

export default function HeadingText({
  children,
  subtext,
  className,
}: HeadingProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">{children}</h1>
      {subtext && (
        <h2 className="font-light text-muted-foreground text-base sm:text-lg lg:text-xl">
          {subtext}
        </h2>
      )}
    </div>
  )
}

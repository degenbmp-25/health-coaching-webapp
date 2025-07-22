import Link from "next/link"

import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import HeadingText from "@/components/heading-text"
import { Icons } from "@/components/icons"

export default async function OpenSource() {
  let stars = 0

  try {
    const response = await fetch("https://api.github.com/repos/redpangilinan/Habithletics", {
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch stargazers count: ${response.statusText}`)
    }

    const data = await response.json()
    stars = data.stargazers_count
  } catch (error) {
    console.error("Error fetching stargazers count:", error)
  }

  return (
    <section className="container py-12 lg:py-20">
      <div className="flex flex-col items-center gap-4">
        <HeadingText
          subtext="Feel free to view the codebase or contribute!"
          className="text-center"
        >
          Fully Open Source
        </HeadingText>
        <Link
          href={siteConfig.links.github}
          target="_blank"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <Icons.star className="mr-2 h-4 w-4" />
          <span>{stars} on Github</span>
        </Link>
      </div>
    </section>
  )
}

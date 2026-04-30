import { SiteConfig } from "@/types"

const appUrl = process.env.NEXT_PUBLIC_APP_URL
let siteUrl = "https://habithletics.vercel.app"

if (appUrl) {
  try {
    siteUrl = new URL(appUrl).toString().replace(/\/$/, "")
  } catch {
    siteUrl = "https://habithletics.vercel.app"
  }
}

export const siteConfig: SiteConfig = {
  name: "Habithletics",
  author: "redpangilinan",
  description:
    "Track daily habits and monitor your progress with little effort.",
  keywords: [
    "Next.js",
    "React",
    "Tailwind CSS",
    "Radix UI",
    "shadcn/ui",
    "Habits",
    "Activity",
    "Track",
    "Monitor",
  ],
  url: {
    base: siteUrl,
    author: "https://redpangilinan.live",
  },
  links: {
    github: "https://github.com/redpangilinan/Habithletics",
  },
  ogImage: `${siteUrl}/og.jpg`,
}

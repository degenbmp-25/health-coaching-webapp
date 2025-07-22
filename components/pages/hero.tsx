import Link from "next/link"
import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import { Badge } from "@/components/ui/badge"

export default function HeroHeader() {
  return (
    <>
      <section className="relative overflow-hidden pb-12 pt-8 md:pt-12 lg:pt-20">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/30" />
        
        <div className="container relative z-10 flex max-w-[64rem] flex-col items-center gap-8 text-center">
          {/* Social proof badge */}
          <Badge variant="secondary" className="gap-2 px-4 py-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            Join 10,000+ people transforming their lives
          </Badge>

          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Transform Your Body,
            <span className="block text-primary">Transform Your Life</span>
          </h1>
          
          <p className="max-w-[42rem] text-lg leading-relaxed text-muted-foreground sm:text-xl sm:leading-8">
            Stop guessing. Start achieving. Track your nutrition and workouts with precision, 
            build lasting habits, and see real results in just 30 days.
          </p>

          {/* Key benefits */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-muted-foreground">
            <div className="flex items-center gap-2">
              <Icons.check className="h-4 w-4 text-green-500" />
              No guesswork
            </div>
            <div className="flex items-center gap-2">
              <Icons.check className="h-4 w-4 text-green-500" />
              Data-driven insights
            </div>
            <div className="flex items-center gap-2">
              <Icons.check className="h-4 w-4 text-green-500" />
              Proven results
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/signin"
              className={cn(buttonVariants({ size: "lg" }), "h-12 px-8 text-base font-semibold")}
            >
              Start Your Transformation
            </Link>
            <Link
              href="#features"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 px-8 text-base")}
            >
              See How It Works
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-8 flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground">Trusted by fitness enthusiasts worldwide</p>
            <div className="flex items-center gap-6 opacity-60">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Icons.star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="ml-2 text-sm font-medium">4.9/5</span>
              </div>
              <div className="text-sm">1,000+ reviews</div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

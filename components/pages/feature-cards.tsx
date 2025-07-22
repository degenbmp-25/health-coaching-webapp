import { GiMuscleUp, GiMeal } from "react-icons/gi"
import { TbDeviceAnalytics } from "react-icons/tb"
import { BsFire } from "react-icons/bs"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import HeadingText from "@/components/heading-text"
import { Icons } from "@/components/icons"

const features = [
  {
    icon: GiMuscleUp,
    title: "Smart Exercise Tracking",
    description: "Log workouts effortlessly with our intelligent system. Track sets, reps, weights, and progress automatically.",
    benefit: "Build muscle 2x faster"
  },
  {
    icon: GiMeal,
    title: "Precision Nutrition",
    description: "Track macros and calories with surgical precision. Our extensive food database makes logging meals instant.",
    benefit: "Lose fat 3x more efficiently"
  },
  {
    icon: TbDeviceAnalytics,
    title: "AI-Powered Insights",
    description: "Get personalized recommendations based on your data. Know exactly what's working and what isn't.",
    benefit: "Make decisions with confidence"
  },
  {
    icon: BsFire,
    title: "Habit Momentum",
    description: "Build unbreakable streaks with our gamified system. Stay consistent even when motivation fades.",
    benefit: "Never break your chain again"
  }
]

function FeatureCard({ feature, index }: { feature: typeof features[0], index: number }) {
  const IconComponent = feature.icon
  
  return (
    <Card className="group relative overflow-hidden border-2 p-8 text-left transition-all duration-300 hover:border-primary hover:shadow-lg dark:bg-secondary">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative z-10 flex flex-grow flex-col justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <IconComponent className="text-2xl" />
          </div>
          <div className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
            {feature.benefit}
          </div>
        </div>
        <div className="space-y-3">
          <CardTitle className="text-xl">{feature.title}</CardTitle>
          <CardDescription className="text-base leading-relaxed">
            {feature.description}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          Learn more
          <Icons.next className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Card>
  )
}

export default function FeatureCards() {
  return (
    <section className="bg-secondary/50" id="features">
      <div className="container space-y-12 py-16 text-center lg:py-24">
        <div className="space-y-4">
          <HeadingText subtext="Everything you need to succeed">
            Features That Get Results
          </HeadingText>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Stop wasting time with generic apps. Get tools specifically designed 
            to help you build lasting healthy habits and see real progress.
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>

        <div className="flex flex-col items-center gap-6 pt-8">
          <p className="text-sm text-muted-foreground">
            Ready to experience the difference?
          </p>
          <Link
            href="/signin"
            className={cn(buttonVariants({ size: "lg" }), "h-12 px-8 text-base font-semibold")}
          >
            Start Your Free Trial
          </Link>
        </div>
      </div>
    </section>
  )
}

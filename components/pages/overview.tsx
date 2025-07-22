import Link from "next/link"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import HeadingText from "@/components/heading-text"
import { Icons } from "@/components/icons"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const steps = [
  {
    number: "01",
    title: "Set Your Goals",
    description: "Define your fitness and nutrition objectives with our personalized goal-setting wizard."
  },
  {
    number: "02", 
    title: "Track Everything",
    description: "Log workouts, meals, and habits effortlessly with our intuitive tracking system."
  },
  {
    number: "03",
    title: "See Results",
    description: "Watch your progress unfold with detailed analytics and actionable insights."
  }
]

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Lost 25 lbs in 3 months",
    content: "Habithletics completely changed how I approach fitness. The insights helped me understand what actually works.",
    avatar: "/avatars/sarah.jpg"
  },
  {
    name: "Mike Rodriguez", 
    role: "Gained 15 lbs muscle",
    content: "Finally found a system that keeps me accountable. The habit tracking feature is a game-changer.",
    avatar: "/avatars/mike.jpg"
  },
  {
    name: "Emma Thompson",
    role: "Improved energy levels",
    content: "The nutrition tracking opened my eyes to how food affects my performance. Life-changing results!",
    avatar: "/avatars/emma.jpg"
  }
]

export default function Overview() {
  return (
    <>
      {/* How it works section */}
      <section className="container py-16 lg:py-24" id="overview">
        <div className="flex flex-col gap-12 text-center">
          <HeadingText subtext="Simple steps to transform your life">
            How Habithletics Works
          </HeadingText>
          
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                <div className="flex flex-col items-center gap-6 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                    {step.number}
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xl font-semibold">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Results section */}
      <section className="bg-secondary py-16 lg:py-24">
        <div className="container">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold lg:text-4xl">
                  Real People, Real Results
                </h2>
                <p className="text-lg text-muted-foreground">
                  Join thousands who&apos;ve transformed their lives with Habithletics. 
                  Our users see measurable results within the first month.
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-8 text-center">
                <div>
                  <div className="text-3xl font-bold text-primary">94%</div>
                  <div className="text-sm text-muted-foreground">Form healthy habits</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary">87%</div>
                  <div className="text-sm text-muted-foreground">Reach their goals</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary">92%</div>
                  <div className="text-sm text-muted-foreground">Stay consistent</div>
                </div>
              </div>

              <Link
                href="/signin"
                className={cn(buttonVariants({ size: "lg" }), "h-12 px-8 text-base font-semibold")}
              >
                Join Them Today
              </Link>
            </div>

            <div className="space-y-6">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="p-6 text-left">
                  <CardContent className="space-y-4 p-0">
                    <p className="text-muted-foreground">&ldquo;{testimonial.content}&rdquo;</p>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={testimonial.avatar} />
                        <AvatarFallback>{testimonial.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">{testimonial.name}</div>
                        <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA section */}
      <section className="container py-16 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold lg:text-4xl">
                Ready to Start Your Transformation?
              </h2>
              <p className="text-lg text-muted-foreground">
                                 Join thousands of people who&apos;ve already transformed their lives. 
                                 Start your journey today - it&apos;s completely free.
              </p>
            </div>
            
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
              <Link
                href="/signin"
                className={cn(buttonVariants({ size: "lg" }), "h-12 px-8 text-base font-semibold")}
              >
                Get Started Free
              </Link>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icons.check className="h-4 w-4 text-green-500" />
                No credit card required
              </div>
            </div>

                         <div className="flex items-center justify-center gap-8 pt-8 text-sm text-muted-foreground">
               <div className="flex items-center gap-2">
                 <Icons.check className="h-4 w-4" />
                 100% Secure
               </div>
               <div className="flex items-center gap-2">
                 <Icons.user className="h-4 w-4" />
                 10,000+ Users
               </div>
               <div className="flex items-center gap-2">
                 <Icons.target className="h-4 w-4" />
                 Instant Setup
               </div>
             </div>
          </div>
        </div>
      </section>
    </>
  )
}

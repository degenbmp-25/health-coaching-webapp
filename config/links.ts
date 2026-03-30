import { Navigation } from "@/types"

export const navLinks: Navigation = {
  data: [
    {
      title: "Home",
      href: "/",
    },
    {
      title: "Features",
      href: "/#features",
    },
    {
      title: "Overview",
      href: "/#overview",
    },
    {
      title: "Dashboard",
      href: "/dashboard",
    },
  ],
}

export const dashboardLinks: Navigation = {
  data: [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: "dashboard",
    },
    {
      title: "Activities",
      href: "/dashboard/activities",
      icon: "activity",
    },
    {
      title: "Workouts",
      href: "/dashboard/workouts",
      icon: "dumbbell",
    },
    {
      title: "Meals",
      href: "/dashboard/meals",
      icon: "meal",
    },
    {
      title: "Coaching",
      href: "/dashboard/coaching",
      icon: "user",
    },
    {
      title: "Messages",
      href: "/dashboard/messages",
      icon: "message",
    },
    {
      title: "Settings",
      href: "/dashboard/settings",
      icon: "settings",
    },
  ],
} as const

export const trainerLinks: Navigation = {
  data: [
    {
      title: "Programs",
      href: "/trainer/programs",
      icon: "target",
    },
    {
      title: "Clients",
      href: "/trainer/clients",
      icon: "user",
    },
  ],
} as const

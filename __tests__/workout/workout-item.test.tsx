import { render, screen } from "@testing-library/react"

import { WorkoutItem } from "@/components/workout/workout-item"

jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      prefetch: () => null,
      push: () => null,
      refresh: () => null,
    }
  },
}))

describe("WorkoutItem", () => {
  const workout = {
    id: "w1",
    name: "Upper Body Strength",
    description: "Focus on chest and back",
    userId: "u1",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    programId: null,
    exercises: [
      {
        id: "we1",
        workoutId: "w1",
        exerciseId: "e1",
        sets: 4,
        reps: 12,
        weight: 60,
        duration: null,
        notes: null,
        order: 0,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    programId: null,
        exercise: {
          id: "e1",
          name: "Bench Press",
          description: "Flat bench press",
          category: "Strength",
          muscleGroup: "Chest",
          equipment: "Barbell",
          imageUrl: null,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
    programId: null,
          userId: null,
        },
      },
      {
        id: "we2",
        workoutId: "w1",
        exerciseId: "e2",
        sets: 3,
        reps: 10,
        weight: 40,
        duration: null,
        notes: null,
        order: 1,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    programId: null,
        exercise: {
          id: "e2",
          name: "Dumbbell Rows",
          description: "Single arm rows",
          category: "Strength",
          muscleGroup: "Back",
          equipment: "Dumbbell",
          imageUrl: null,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
    programId: null,
          userId: null,
        },
      },
    ],
  }

  it("renders workout name", () => {
    render(<WorkoutItem workout={workout} />)
    expect(screen.getByText("Upper Body Strength")).toBeInTheDocument()
  })

  it("renders workout description", () => {
    render(<WorkoutItem workout={workout} />)
    expect(screen.getByText("Focus on chest and back")).toBeInTheDocument()
  })

  it("renders exercise count", () => {
    render(<WorkoutItem workout={workout} />)
    expect(screen.getByText("2 exercises")).toBeInTheDocument()
  })

  it("renders total sets count", () => {
    render(<WorkoutItem workout={workout} />)
    expect(screen.getByText("7 sets")).toBeInTheDocument()
  })

  it("renders muscle group badges", () => {
    render(<WorkoutItem workout={workout} />)
    expect(screen.getByText("Chest")).toBeInTheDocument()
    expect(screen.getByText("Back")).toBeInTheDocument()
  })

  it("renders exercise names in preview", () => {
    render(<WorkoutItem workout={workout} />)
    expect(screen.getByText("Bench Press")).toBeInTheDocument()
    expect(screen.getByText("Dumbbell Rows")).toBeInTheDocument()
  })

  it("links to the workout session page", () => {
    render(<WorkoutItem workout={workout} />)
    const links = screen.getAllByRole("link")
    const sessionLink = links.find((link) =>
      link.getAttribute("href") === "/dashboard/workouts/w1"
    )
    expect(sessionLink).toBeTruthy()
  })

  it("renders Start Workout button", () => {
    render(<WorkoutItem workout={workout} />)
    expect(screen.getByText("Start Workout")).toBeInTheDocument()
  })
})

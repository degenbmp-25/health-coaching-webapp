import { render, screen } from "@testing-library/react"

import { WorkoutList } from "@/components/workout/workout-list"

jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      prefetch: () => null,
      push: () => null,
      refresh: () => null,
    }
  },
}))

describe("WorkoutList", () => {
  it("renders empty state when no workouts", () => {
    render(<WorkoutList workouts={[]} />)
    expect(screen.getByText("No workouts created")).toBeInTheDocument()
    expect(
      screen.getByText("Create your first workout plan to get started.")
    ).toBeInTheDocument()
  })

  it("renders workout cards when workouts exist", () => {
    const workouts = [
      {
        id: "w1",
        name: "Workout A",
        description: "Test",
        userId: "u1",
        createdAt: new Date(),
        updatedAt: new Date(),
        programId: null,
        exercises: [
          {
            id: "we1",
            workoutId: "w1",
            exerciseId: "e1",
            sets: 3,
            reps: 10,
            weight: null,
            duration: null,
            notes: null,
            order: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            exercise: {
              id: "e1",
              name: "Push-ups",
              description: null,
              category: "Bodyweight",
              muscleGroup: "Chest",
              equipment: null,
              imageUrl: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              userId: null,
            },
          },
        ],
      },
      {
        id: "w2",
        name: "Workout B",
        description: null,
        userId: "u1",
        createdAt: new Date(),
        updatedAt: new Date(),
        programId: null,
        exercises: [],
      },
    ]

    render(<WorkoutList workouts={workouts} />)
    expect(screen.getByText("Workout A")).toBeInTheDocument()
    expect(screen.getByText("Workout B")).toBeInTheDocument()
  })
})

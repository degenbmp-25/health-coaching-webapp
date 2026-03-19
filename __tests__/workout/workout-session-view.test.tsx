import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { WorkoutSessionView } from "@/components/workout/workout-session-view"

jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      prefetch: () => null,
      push: jest.fn(),
      refresh: () => null,
    }
  },
}))

const mockWorkout = {
  id: "w1",
  name: "Upper Body Strength",
  description: "Focus on chest and back",
  userId: "u1",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  exercises: [
    {
      id: "we1",
      workoutId: "w1",
      exerciseId: "e1",
      sets: 2,
      reps: 10,
      weight: 60,
      duration: null,
      notes: "Keep core tight",
      order: 0,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
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
        userId: null,
      },
    },
    {
      id: "we2",
      workoutId: "w1",
      exerciseId: "e2",
      sets: 2,
      reps: 8,
      weight: null,
      duration: 30,
      notes: null,
      order: 1,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      exercise: {
        id: "e2",
        name: "Plank Hold",
        description: "Core hold",
        category: "Core",
        muscleGroup: "Abs",
        equipment: null,
        imageUrl: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        userId: null,
      },
    },
  ],
}

describe("WorkoutSessionView", () => {
  it("renders workout name and description", () => {
    render(<WorkoutSessionView workout={mockWorkout} />)
    expect(screen.getByText("Upper Body Strength")).toBeInTheDocument()
    expect(screen.getByText("Focus on chest and back")).toBeInTheDocument()
  })

  it("renders exercise count badge", () => {
    render(<WorkoutSessionView workout={mockWorkout} />)
    expect(screen.getByText("0/2 exercises")).toBeInTheDocument()
  })

  it("renders progress info", () => {
    render(<WorkoutSessionView workout={mockWorkout} />)
    expect(screen.getByText("0 of 4 sets complete")).toBeInTheDocument()
    expect(screen.getByText("0%")).toBeInTheDocument()
  })

  it("renders category headers", () => {
    render(<WorkoutSessionView workout={mockWorkout} />)
    expect(screen.getByText("Strength")).toBeInTheDocument()
    expect(screen.getByText("Core")).toBeInTheDocument()
  })

  it("renders exercise names with numbers", () => {
    render(<WorkoutSessionView workout={mockWorkout} />)
    expect(screen.getByText("Bench Press")).toBeInTheDocument()
    expect(screen.getByText("Plank Hold")).toBeInTheDocument()
    // Exercise numbers are rendered as badge numbers
    const numberBadges = screen.getAllByText("1")
    expect(numberBadges.length).toBeGreaterThanOrEqual(1)
  })

  it("renders set/rep badges", () => {
    render(<WorkoutSessionView workout={mockWorkout} />)
    const setBadges = screen.getAllByText("2 sets")
    expect(setBadges.length).toBe(2) // One per exercise
  })

  it("renders muscle group badges", () => {
    render(<WorkoutSessionView workout={mockWorkout} />)
    expect(screen.getByText("Chest")).toBeInTheDocument()
    expect(screen.getByText("Abs")).toBeInTheDocument()
  })

  it("renders exercise notes", () => {
    render(<WorkoutSessionView workout={mockWorkout} />)
    expect(screen.getByText("Keep core tight")).toBeInTheDocument()
  })

  it("renders weight badge for exercises with weight", () => {
    render(<WorkoutSessionView workout={mockWorkout} />)
    expect(screen.getByText("60 kg")).toBeInTheDocument()
  })

  it("renders duration badge for exercises with duration", () => {
    render(<WorkoutSessionView workout={mockWorkout} />)
    expect(screen.getByText("30s")).toBeInTheDocument()
  })

  it("renders set tracking rows", () => {
    render(<WorkoutSessionView workout={mockWorkout} />)
    const set1Labels = screen.getAllByText("Set 1")
    const set2Labels = screen.getAllByText("Set 2")
    expect(set1Labels.length).toBe(2) // One for each exercise
    expect(set2Labels.length).toBe(2)
  })

  it("renders Mark as Complete buttons", () => {
    render(<WorkoutSessionView workout={mockWorkout} />)
    const completeButtons = screen.getAllByText("Mark as Complete")
    expect(completeButtons.length).toBe(2)
  })

  it("toggles set completion on checkbox click", async () => {
    const user = userEvent.setup()
    render(<WorkoutSessionView workout={mockWorkout} />)

    const checkboxes = screen.getAllByRole("button", { name: /Toggle set \d+ complete/ })
    expect(checkboxes.length).toBe(4) // 2 exercises x 2 sets each

    await user.click(checkboxes[0])
    // After clicking, progress should update
    expect(screen.getByText("1 of 4 sets complete")).toBeInTheDocument()
    expect(screen.getByText("25%")).toBeInTheDocument()
  })

  it("marks exercise as complete when Mark as Complete is clicked", async () => {
    const user = userEvent.setup()
    render(<WorkoutSessionView workout={mockWorkout} />)

    const completeButtons = screen.getAllByText("Mark as Complete")
    await user.click(completeButtons[0])

    // Should now show "Completed" for first exercise
    expect(screen.getByText("Completed")).toBeInTheDocument()
    // Should update progress
    expect(screen.getByText("2 of 4 sets complete")).toBeInTheDocument()
  })

  it("allows weight input", async () => {
    const user = userEvent.setup()
    render(<WorkoutSessionView workout={mockWorkout} />)

    const weightInputs = screen.getAllByLabelText(/Set \d+ weight/)
    expect(weightInputs.length).toBe(4)

    await user.type(weightInputs[0], "65")
    expect(weightInputs[0]).toHaveValue("65")
  })

  it("allows reps input", async () => {
    const user = userEvent.setup()
    render(<WorkoutSessionView workout={mockWorkout} />)

    const repsInputs = screen.getAllByLabelText(/Set \d+ reps/)
    expect(repsInputs.length).toBe(4)

    await user.type(repsInputs[0], "12")
    expect(repsInputs[0]).toHaveValue("12")
  })

  it("shows workout complete card when all exercises are done", async () => {
    const user = userEvent.setup()
    render(<WorkoutSessionView workout={mockWorkout} />)

    // Complete all exercises
    const completeButtons = screen.getAllByText("Mark as Complete")
    await user.click(completeButtons[0])

    const remainingButtons = screen.getAllByText("Mark as Complete")
    await user.click(remainingButtons[0])

    expect(screen.getByText("Workout Complete!")).toBeInTheDocument()
    expect(screen.getByText("Back to Workouts")).toBeInTheDocument()
  })
})

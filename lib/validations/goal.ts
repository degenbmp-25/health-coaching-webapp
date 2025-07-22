import * as z from "zod"

export const goalSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().optional(),
  targetDate: z.string().optional(),
  userId: z.string().optional(), // For coaches creating goals for students
})

export const updateGoalSchema = goalSchema.extend({
  isCompleted: z.boolean().optional(),
}) 
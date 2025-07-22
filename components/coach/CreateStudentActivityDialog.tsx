"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Icons } from "@/components/icons";

// Simple color picker options
const colorOptions = [
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#84cc16", // Lime
  "#22c55e", // Green
  "#14b8a6", // Teal
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#8b5cf6", // Violet
  "#d946ef", // Fuchsia
  "#ec4899", // Pink
  "#78716c", // Stone
];

const activityFormSchema = z.object({
  name: z.string().min(2, {
    message: "Activity name must be at least 2 characters.",
  }),
  description: z.string().max(160).optional(),
  colorCode: z.string({
    required_error: "Please select a color.",
  }),
});

type ActivityFormValues = z.infer<typeof activityFormSchema>;

interface CreateStudentActivityDialogProps {
  studentId: string;
  studentName: string | null;
  onClose: () => void;
  onActivityCreated: () => void;
}

export function CreateStudentActivityDialog({
  studentId,
  studentName,
  onClose,
  onActivityCreated,
}: CreateStudentActivityDialogProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      name: "",
      description: "",
      colorCode: "",
    },
    mode: "onChange",
  });

  async function onSubmit(data: ActivityFormValues) {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/users/${studentId}/activities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create activity. Please try again.");
      }

      toast({
        title: "Activity Created",
        description: `"${data.name}" has been added for ${studentName}.`,
      });
      onActivityCreated(); // Refresh the list in the parent component
    } catch (error) {
      console.error("Error creating activity:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    form.setValue("colorCode", color, { shouldValidate: true });
  };

  return (
    <DialogContent className="sm:max-w-[480px]">
      <DialogHeader>
        <DialogTitle>Create Activity for {studentName}</DialogTitle>
        <DialogDescription>
          Add a new habit or activity for your student to track.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Activity Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Morning Run" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Brief description or goal (max 160 characters)"
                    className="resize-none"
                    {...field}
                    value={field.value || ""} // Ensure controlled component
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="colorCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color Tag</FormLabel>
                <FormControl>
                  {/* Pass field props to a hidden input or manage state separately */}
                  {/* We use selectedColor state for UI and update form value */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`h-7 w-7 rounded-full border-2 transition-transform duration-100 ease-in-out ${
                          selectedColor === color
                            ? "border-primary scale-110 ring-2 ring-primary ring-offset-2"
                            : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => handleColorSelect(color)}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                  </div>
                </FormControl>
                 <FormDescription>
                   Choose a color to represent this activity.
                 </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Activity
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
} 
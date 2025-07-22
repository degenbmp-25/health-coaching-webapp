"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Credenza,
  CredenzaClose,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
} from "@/components/ui/credenza"
import { toast } from "@/components/ui/use-toast"
import { Icons } from "@/components/icons"

interface StudentActivityDeleteButtonProps {
  activityId: string
  activityName: string
  onDeleted: () => void
}

export function StudentActivityDeleteButton({
  activityId,
  activityName,
  onDeleted,
}: StudentActivityDeleteButtonProps) {
  const [showDeleteAlert, setShowDeleteAlert] = React.useState<boolean>(false)
  const [isDeleteLoading, setIsDeleteLoading] = React.useState<boolean>(false)

  async function deleteActivity() {
    setIsDeleteLoading(true)
    
    try {
      const response = await fetch(`/api/activities/${activityId}`, {
        method: "DELETE",
      })

      if (!response?.ok) {
        toast({
          title: "Something went wrong.",
          description: "The activity was not deleted. Please try again.",
          variant: "destructive",
        })
      } else {
        toast({
          description: `${activityName} has been deleted successfully.`,
        })
        onDeleted()
        setShowDeleteAlert(false)
      }
    } catch (error) {
      toast({
        title: "Something went wrong.",
        description: "The activity was not deleted. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleteLoading(false)
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
        onClick={() => setShowDeleteAlert(true)}
      >
        <Icons.trash className="h-4 w-4" />
      </Button>

      <Credenza open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <CredenzaContent>
          <CredenzaHeader>
            <CredenzaTitle>
              Delete &quot;{activityName}&quot;?
            </CredenzaTitle>
            <CredenzaDescription>
              This action cannot be undone. This will permanently delete the activity and all associated logs.
            </CredenzaDescription>
          </CredenzaHeader>
          <CredenzaFooter className="flex flex-col-reverse">
            <CredenzaClose asChild>
              <Button variant="outline">Cancel</Button>
            </CredenzaClose>
            <Button
              onClick={deleteActivity}
              disabled={isDeleteLoading}
              className="bg-red-600 focus:ring-red-600"
            >
              {isDeleteLoading ? (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icons.trash className="mr-2 h-4 w-4" />
              )}
              <span>Delete</span>
            </Button>
          </CredenzaFooter>
        </CredenzaContent>
      </Credenza>
    </>
  )
} 
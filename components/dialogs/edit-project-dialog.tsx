"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface EditProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectName: string
  projectDescription: string
  onSave: (name: string, description: string) => void
}

export function EditProjectDialog({
  open,
  onOpenChange,
  projectName,
  projectDescription,
  onSave,
}: EditProjectDialogProps) {
  const [name, setName] = useState(projectName)
  const [description, setDescription] = useState(projectDescription)
  const [error, setError] = useState("")

  // Update local state when props change
  useEffect(() => {
    setName(projectName)
    setDescription(projectDescription)
  }, [projectName, projectDescription])

  const handleSave = () => {
    if (!name.trim()) {
      setError("Project name is required")
      return
    }

    onSave(name.trim(), description.trim())
    setError("")
    onOpenChange(false)
  }

  const handleCancel = () => {
    setName(projectName)
    setDescription(projectDescription)
    setError("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update your project name and description.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-project-name">Project Name *</Label>
            <Input
              id="edit-project-name"
              placeholder="My Infrastructure Project"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError("")
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) {
                  handleSave()
                }
              }}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-project-description">Description (Optional)</Label>
            <Textarea
              id="edit-project-description"
              placeholder="Describe what this project is for..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Folder, Search, Calendar, Trash2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export interface Project {
  id: string
  name: string
  description: string
  provider?: "aws" | "gcp" | "azure" | "supabase" | "hybrid"
  createdAt: string
  lastModified: string
  blocks: any[]
  connections: any[]
}

interface OpenProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projects: Project[]
  currentProjectId: string | null
  onOpenProject: (project: Project) => void
  onDeleteProject: (projectId: string) => void
}

export function OpenProjectDialog({
  open,
  onOpenChange,
  projects,
  currentProjectId,
  onOpenProject,
  onDeleteProject,
}: OpenProjectDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null)

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleOpenProject = (project: Project) => {
    onOpenProject(project)
    onOpenChange(false)
  }

  const handleDeleteClick = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation()
    setProjectToDelete(projectId)
  }

  const confirmDelete = () => {
    if (projectToDelete) {
      onDeleteProject(projectToDelete)
      setProjectToDelete(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Open Project</DialogTitle>
          <DialogDescription>
            Select a project to open and continue working on it.
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Projects Grid */}
        <ScrollArea className="h-[500px] pr-4">
          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Folder className="w-12 h-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No projects found matching your search." : "No projects yet. Create your first project to get started!"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filteredProjects.map((project) => (
                <Card
                  key={project.id}
                  className={`cursor-pointer transition-all hover:shadow-md h-64 flex flex-col overflow-hidden ${
                    project.id === currentProjectId 
                      ? "border-purple-500 bg-purple-500/10 hover:border-purple-600" 
                      : "hover:border-purple-300"
                  }`}
                  onClick={() => handleOpenProject(project)}
                >
                  <CardHeader className="pb-1 px-4 pt-3 flex-none">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm line-clamp-1 flex items-center gap-2">
                          {project.name}
                          {project.id === currentProjectId && (
                            <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded-full whitespace-nowrap">
                              Current
                            </span>
                          )}
                        </CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-red-100 hover:text-red-600 h-6 w-6 p-0 flex-shrink-0"
                        onClick={(e) => handleDeleteClick(e, project.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 px-4 pb-3 flex flex-col min-h-0">
                    {project.description ? (
                      <CardDescription className="text-xs line-clamp-2 mb-2">
                        {project.description}
                      </CardDescription>
                    ) : (
                      <div className="text-xs text-muted-foreground/50 italic mb-2">No description</div>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-auto">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span className="truncate">
                          {project.lastModified === "Just now"
                            ? "Just now"
                            : formatDistanceToNow(new Date(project.lastModified), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="truncate">
                        {project.blocks?.length || 0} blocks • {project.connections?.length || 0} connections
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!projectToDelete} onOpenChange={() => setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
              All project data and configurations will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}


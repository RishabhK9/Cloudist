"use client"

import { useState } from "react"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FaAws } from "react-icons/fa"
import { SiGooglecloud } from "react-icons/si"
import { VscAzure } from "react-icons/vsc"
import { ArrowLeft } from "lucide-react"

type CloudProvider = "aws" | "gcp" | "azure"

interface CreateNewProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateProject: (name: string, description: string, provider: CloudProvider) => void
}

const lightenColor = (hex: string, amount: number) => {
  const sanitized = hex.replace("#", "");
  const num = parseInt(sanitized, 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0x00ff) + amount);
  const b = Math.min(255, (num & 0x0000ff) + amount);

  return `#${[r, g, b]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
};

export function CreateNewProjectDialog({
  open,
  onOpenChange,
  onCreateProject,
}: CreateNewProjectDialogProps) {
  const [step, setStep] = useState<"provider" | "details">("provider")
  const [provider, setProvider] = useState<CloudProvider | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState("")

  const providers = [
    {
      id: "aws" as const,
      name: "Amazon Web Services",
      description: "Build on the world's most comprehensive cloud platform",
      logo: FaAws,
      color: "#FF9900",
      available: true,
    },
    {
      id: "gcp" as const,
      name: "Google Cloud Platform",
      description: "Transform your business with Google's proven technology",
      logo: SiGooglecloud,
      color: "#4285F4",
      available: false,
    },
    {
      id: "azure" as const,
      name: "Microsoft Azure",
      description: "Invent with purpose on a trusted cloud platform",
      logo: VscAzure,
      color: "#0078D4",
      available: false,
    },
  ]

  const handleProviderSelect = (selectedProvider: CloudProvider) => {
    setProvider(selectedProvider)
    setStep("details")
  }

  const handleCreate = () => {
    if (!name.trim()) {
      setError("Project name is required")
      return
    }

    if (!provider) {
      setError("Please select a cloud provider")
      return
    }

    onCreateProject(name.trim(), description.trim(), provider)
    
    // Reset state
    setStep("provider")
    setProvider(null)
    setName("")
    setDescription("")
    setError("")
    onOpenChange(false)
  }

  const handleCancel = () => {
    setStep("provider")
    setProvider(null)
    setName("")
    setDescription("")
    setError("")
    onOpenChange(false)
  }

  const handleBack = () => {
    setStep("provider")
    setError("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        {step === "provider" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Choose Your Cloud Provider</DialogTitle>
              <DialogDescription>
                Select the cloud platform you want to design your infrastructure for.
              </DialogDescription>
            </DialogHeader>

            <div className="grid md:grid-cols-3 gap-4 py-4">
              {providers.map((prov) => (
                <Card
                  key={prov.id}
                  className={`group relative overflow-hidden border transition-all duration-300 ${
                    prov.available
                      ? "cursor-pointer hover:-translate-y-1 hover:shadow-lg"
                      : "cursor-not-allowed opacity-60"
                  }`}
                  onClick={() => prov.available && handleProviderSelect(prov.id)}
                >
                  {prov.available && (
                    <span
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-1 rounded-b-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      style={{
                        background: `linear-gradient(90deg, ${prov.color}, ${lightenColor(prov.color, 45)})`,
                      }}
                    />
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex flex-col items-center text-center space-y-2">
                      <prov.logo size={48} color={prov.color} />
                      <CardTitle className="text-sm">{prov.name}</CardTitle>
                      <CardDescription className="text-xs line-clamp-2">
                        {prov.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant={prov.available ? "default" : "outline"}
                      className="w-full"
                      style={
                        prov.available
                          ? {
                              background: `linear-gradient(135deg, ${prov.color}, ${lightenColor(
                                prov.color,
                                45,
                              )})`,
                            }
                          : undefined
                      }
                      disabled={!prov.available}
                    >
                      {prov.available ? "Get Started" : "Coming Soon"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="h-8 w-8"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Give your {provider?.toUpperCase()} project a name and description
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name *</Label>
                <Input
                  id="project-name"
                  placeholder="My Infrastructure Project"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setError("")
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && name.trim()) {
                      handleCreate()
                    }
                  }}
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-description">Description (Optional)</Label>
                <Textarea
                  id="project-description"
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
              <Button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-700">
                Create Project
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}


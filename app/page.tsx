"use client"

import { useState } from "react"
import { Dashboard } from "@/components/dashboard"
import { InfrastructureBuilder } from "@/components/infrastructure-builder"

export default function HomePage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  if (selectedProjectId) {
    return (
      <InfrastructureBuilder 
        projectId={selectedProjectId}
        onBackToHome={() => setSelectedProjectId(null)}
      />
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <Dashboard onProjectSelect={(projectId) => setSelectedProjectId(projectId)} />
    </main>
  )
}

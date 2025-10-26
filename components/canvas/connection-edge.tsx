"use client"

import { ConnectionEdge as ConnectionEdgeType } from "@/types"
import { type EdgeProps, getBezierPath, Position } from "@xyflow/react"
import { memo } from "react"

// Helper function to extract position from handle ID
const getPositionFromHandleId = (handleId: string | null | undefined): Position => {
  if (!handleId) return Position.Right
  
  // Handle ID formats: "left", "right", "top", "bottom"
  const lowerHandleId = handleId.toLowerCase()
  
  if (lowerHandleId === 'left' || lowerHandleId.includes('left')) return Position.Left
  if (lowerHandleId === 'right' || lowerHandleId.includes('right')) return Position.Right
  if (lowerHandleId === 'top' || lowerHandleId.includes('top')) return Position.Top
  if (lowerHandleId === 'bottom' || lowerHandleId.includes('bottom')) return Position.Bottom
  
  return Position.Right // default fallback
}

export const ConnectionEdge = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    sourceHandleId,
    targetHandleId,
    data,
    selected,
  }: EdgeProps<ConnectionEdgeType>) => {
    // Determine the actual positions from handle IDs if sourcePosition/targetPosition aren't set
    const actualSourcePosition = sourcePosition || getPositionFromHandleId(sourceHandleId)
    const actualTargetPosition = targetPosition || getPositionFromHandleId(targetHandleId)
    
    // Create a smooth bezier curve that properly connects from source to target
    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition: actualSourcePosition,
      targetX,
      targetY,
      targetPosition: actualTargetPosition,
    })

    // Purple color for all connections
    const lineColor = "#a855f7" // purple-500

    return (
      <>
        {/* Invisible wider path for easier selection */}
        <path
          id={`${id}-invisible`}
          d={edgePath}
          strokeWidth={20}
          fill="none"
          stroke="transparent"
          style={{ 
            cursor: "pointer",
            pointerEvents: "all"
          }}
        />
        {/* Visible edge path with smooth bezier curve */}
        <path
          id={id}
          className="react-flow__edge-path"
          d={edgePath}
          strokeWidth={selected ? 5 : 4}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ 
            stroke: selected ? "#ef4444" : lineColor, // red when selected, purple otherwise
            cursor: "pointer",
            pointerEvents: "all",
            transition: "stroke 0.2s ease-in-out, stroke-width 0.2s ease-in-out"
          }}
          data-custom="true"
        />
        {/* Optional: Add an arrowhead marker */}
        <defs>
          <marker
            id={`arrow-${id}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path
              d="M 0 0 L 10 5 L 0 10 z"
              fill={selected ? "#ef4444" : lineColor}
              style={{ transition: "fill 0.2s ease-in-out" }}
            />
          </marker>
        </defs>
      </>
    )
  },
)

ConnectionEdge.displayName = "ConnectionEdge"

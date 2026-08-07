import * as React from "react"
import { cn } from "@/lib/utils"

// Skeleton: block placeholder dùng khi Suspense fallback hoặc data chưa load xong.
// Neo-brutalism: border-2 + animate-pulse (linear opacity fade, không shimmer gradient).

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "border-2 border-border bg-muted motion-safe:animate-pulse",
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }

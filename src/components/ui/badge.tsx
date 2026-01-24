import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center px-2 py-0.5 text-xs font-medium uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-primary text-primary-foreground",
        secondary:
          "border border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border border-transparent bg-error text-white",
        outline: "border border-border text-foreground",
        success:
          "border border-success/30 bg-success/10 text-success",
        warning:
          "border border-warning/30 bg-warning/10 text-warning",
        info:
          "border border-info/30 bg-info/10 text-info",
        running:
          "border border-active/30 bg-active/10 text-active",
        sleeping:
          "border border-sleeping/30 bg-sleeping/10 text-sleeping",
        stopped:
          "border border-border bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

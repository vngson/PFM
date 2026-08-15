import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Neo-brutalism badge: không radius, border-2 đen, font đậm uppercase nhỏ.
const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden border-2 border-border px-2.5 py-0.5 font-heading text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all focus-visible:translate-x-[1px] focus-visible:translate-y-[1px] focus-visible:shadow-brutal-sm aria-invalid:border-destructive [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary:
          "bg-secondary text-secondary-foreground",
        destructive:
          "bg-destructive text-destructive-foreground",
        outline:
          "bg-background text-foreground",
        ghost: "border-transparent",
        link: "border-transparent text-primary underline-offset-4 hover:underline",
        success:
          "bg-success text-success-foreground",
        warning:
          "bg-warning text-warning-foreground",
        expense:
          "bg-expense text-white",
        income:
          "bg-income text-white",
      },
      size: {
        // Default — chiếm nhiều width, dùng cho desktop.
        default: "h-6 px-2.5 text-xs",
        // Compact — giảm height/padding/text để list dày trên mobile có
        // đủ chỗ cho name + amount mà vẫn show được nhiều badge.
        sm: "h-5 gap-0.5 px-1.5 text-[10px] tracking-wide",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  size = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant, size }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
      size,
    },
  })
}

export { Badge, badgeVariants }

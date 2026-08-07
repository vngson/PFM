import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Neo-brutalism: border-2 đen tuyệt đối, hard shadow (không blur),
// hover "nhấn xuống" = translate + mất shadow.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-1.5 border-2 border-border bg-clip-padding font-heading text-sm font-bold uppercase tracking-wide whitespace-nowrap transition-all outline-none select-none focus-visible:translate-x-[2px] focus-visible:translate-y-[2px] focus-visible:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-brutal-sm hover:shadow-brutal hover:-translate-x-[2px] hover:-translate-y-[2px]",
        outline:
          "bg-background text-foreground shadow-brutal-sm hover:shadow-brutal hover:-translate-x-[2px] hover:-translate-y-[2px]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-brutal-sm hover:shadow-brutal hover:-translate-x-[2px] hover:-translate-y-[2px]",
        ghost:
          "border-transparent shadow-none hover:bg-muted hover:text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground shadow-brutal-sm hover:shadow-brutal hover:-translate-x-[2px] hover:-translate-y-[2px]",
        link: "border-transparent text-foreground underline-offset-4 hover:underline shadow-none",
        success:
          "bg-success text-success-foreground shadow-brutal-sm hover:shadow-brutal hover:-translate-x-[2px] hover:-translate-y-[2px]",
      },
      size: {
        default: "h-10 px-4",
        xs: "h-7 px-2.5 text-xs",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "size-10",
        "icon-xs": "size-7",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

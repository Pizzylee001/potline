import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium transition-[transform,background-color,border-color,color,opacity] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-brass text-brass-ink hover:brightness-105 border border-transparent",
        outline:
          "border border-hairline-strong bg-transparent text-text hover:bg-surface",
        ghost: "border border-transparent text-muted hover:bg-surface hover:text-text",
        link: "bg-transparent text-brass underline-offset-4 hover:underline",
        destructive:
          "border border-destructive/50 bg-transparent text-destructive hover:bg-destructive/10",
      },
      size: {
        sm: "h-8 px-3 text-small",
        default: "h-10 px-4 text-small",
        lg: "h-11 px-5 text-body",
        icon: "size-10",
        iconSm: "size-8",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };

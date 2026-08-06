import type * as React from "react";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        blue: "border-transparent bg-blue-100 text-blue-800 [a&]:hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:[a&]:hover:bg-blue-900/50",
        green:
          "border-transparent bg-green-100 text-green-800 [a&]:hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:[a&]:hover:bg-green-900/50",
        yellow:
          "border-transparent bg-yellow-100 text-yellow-800 [a&]:hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:[a&]:hover:bg-yellow-900/50",
        red: "border-transparent bg-red-100 text-red-800 [a&]:hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:[a&]:hover:bg-red-900/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    render,
    props: mergeProps<"span">(
      {
        "data-slot": "badge",
        className: cn(badgeVariants({ variant }), className),
      } as React.ComponentProps<"span">,
      props,
    ),
  });
}

export { Badge, badgeVariants };

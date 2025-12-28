import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>;

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold", {
  variants: {
    variant: {
      info: "bg-[var(--panel-soft)] text-[var(--primary-strong)] border border-[var(--border)]",
      success: "bg-[var(--panel-soft)] text-[var(--success)] border border-[var(--border)]",
      warning: "bg-[var(--panel-soft)] text-[var(--warning)] border border-[var(--border)]",
      neutral: "bg-[var(--panel-soft)] text-[var(--muted)] border border-[var(--border)]",
    },
  },
  defaultVariants: {
    variant: "neutral",
  },
});

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

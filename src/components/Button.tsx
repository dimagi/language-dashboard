import * as React from "react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', children, ...props }, ref) => {
    const baseClasses = "btn";
    const variantClasses = {
      default: "btn-default",
      destructive: "btn btn-outline", // Using outline as fallback
      outline: "btn-outline",
      secondary: "btn-secondary",
      ghost: "btn-outline", // Using outline as fallback
      link: "btn-outline" // Using outline as fallback
    };
    const sizeClasses = {
      default: "",
      sm: "btn-sm",
      lg: "",
      icon: ""
    };

    const classes = [
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      className
    ].filter(Boolean).join(" ");

    return (
      <button
        className={classes}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }
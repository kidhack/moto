import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    // Base styles - matches Figma: 64px height, no rounded corners, Public Sans Bold
    const baseStyles = 'inline-flex items-center justify-center font-bold text-base leading-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 rounded-none';
    
    // Variant styles
    const variantStyles = {
      outline: 'h-16 border-2 border-white/80 bg-transparent text-white/80 hover:bg-white/10',
      ghost: 'h-10 px-4 py-2 bg-transparent text-white/80 hover:bg-white/10',
      default: 'h-16 border-2 border-white/80 bg-transparent text-white/80 hover:bg-white hover:text-black',
      destructive: 'h-16 border-2 border-red-500/80 bg-transparent text-red-400 hover:bg-red-500/10',
    };
    
    // Size styles
    const sizeStyles = {
      default: '',
      sm: 'h-10 px-3 text-sm',
      lg: 'h-16 px-6',
      icon: 'h-10 w-10',
    };
    
    return (
      <button
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };


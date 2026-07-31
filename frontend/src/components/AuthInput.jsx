import React from 'react';
import { cn } from '../lib/utils';

const AuthInput = React.forwardRef(({
  label,
  icon: Icon,
  error,
  helperText,
  rightElement,
  className,
  containerClassName,
  ...props
}, ref) => {
  return (
    <div className={cn('mb-5', containerClassName)}>
      {label && (
        <label className="block text-sm font-bold text-foreground mb-2">
          {label}
        </label>
      )}
      <div className="relative group">
        {Icon && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none transition-colors group-focus-within:text-foreground/70">
            <Icon className="h-4.5 w-4.5" />
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 transition-all duration-300',
            'backdrop-blur-sm',
            'focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10 focus:bg-background/80',
            'hover:border-border hover:bg-background/70',
            error && 'border-destructive/50 focus:border-destructive/50 focus:ring-destructive/10',
            Icon && 'pr-11',
            rightElement && 'pl-11',
            className
          )}
          {...props}
        />
        {rightElement && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
      {helperText && (
        <p className="mt-1.5 text-xs text-muted-foreground">{helperText}</p>
      )}
      {error && (
        <p className="mt-1.5 text-xs text-destructive font-medium">{error}</p>
      )}
    </div>
  );
});

AuthInput.displayName = 'AuthInput';

export default AuthInput;

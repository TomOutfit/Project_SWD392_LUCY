// src/components/ui/Input.tsx
import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-exo font-medium text-mist">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`input-field ${error ? 'border-magenta focus:border-magenta focus:shadow-[0_0_0_3px_rgba(255,45,107,0.1)]' : ''} ${className}`}
        {...props}
      />
      {error && (
        <p className="text-xs text-magenta font-inter">{error}</p>
      )}
    </div>
  )
);
Input.displayName = 'Input';

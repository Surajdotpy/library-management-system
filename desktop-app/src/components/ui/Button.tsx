import { forwardRef, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref' | 'children'> {
  children?: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    // Modern gradient variants (2025 style)
    const variants = {
      primary: `
        bg-gradient-to-r from-purple-600 to-blue-600 
        hover:from-purple-700 hover:to-blue-700
        text-white shadow-lg shadow-purple-500/30
        hover:shadow-xl hover:shadow-purple-500/40
        border border-purple-500/20
      `,
      secondary: `
        bg-white text-gray-700 
        border border-gray-200
        hover:bg-gray-50 hover:border-gray-300
        shadow-sm
      `,
      success: `
        bg-gradient-to-r from-emerald-500 to-teal-600
        hover:from-emerald-600 hover:to-teal-700
        text-white shadow-lg shadow-emerald-500/30
        hover:shadow-xl hover:shadow-emerald-500/40
        border border-emerald-400/20
      `,
      danger: `
        bg-gradient-to-r from-red-500 to-rose-600
        hover:from-red-600 hover:to-rose-700
        text-white shadow-lg shadow-red-500/30
        hover:shadow-xl hover:shadow-red-500/40
        border border-red-400/20
      `,
      warning: `
        bg-gradient-to-r from-amber-500 to-orange-500
        hover:from-amber-600 hover:to-orange-600
        text-white shadow-lg shadow-amber-500/30
        hover:shadow-xl hover:shadow-amber-500/40
        border border-amber-400/20
      `,
      ghost: `
        bg-transparent 
        text-gray-700 
        hover:bg-gray-100
        border border-transparent
        hover:border-gray-200
      `,
      outline: `
        bg-transparent 
        text-purple-600 
        border border-purple-600
        hover:bg-purple-50
        hover:border-purple-700
        hover:text-purple-700
      `,
    };

    // Modern sizes
    const sizes = {
      sm: 'px-4 py-2 text-sm font-medium',
      md: 'px-6 py-2.5 text-base font-semibold',
      lg: 'px-8 py-3 text-lg font-semibold',
    };

    return (
      <motion.button
        ref={ref}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ 
          scale: disabled || isLoading ? 1 : 1.02,
          y: disabled || isLoading ? 0 : -2,
        }}
        whileTap={{ 
          scale: disabled || isLoading ? 1 : 0.98,
          y: disabled || isLoading ? 0 : 0,
        }}
        transition={{ 
          type: "spring",
          stiffness: 400,
          damping: 17
        }}
        className={`
          ${variants[variant]}
          ${sizes[size]}
          ${fullWidth ? 'w-full' : ''}
          rounded-xl
          transition-all duration-300 ease-out
          disabled:opacity-50 disabled:cursor-not-allowed
          disabled:shadow-none
          flex items-center justify-center gap-2
          relative overflow-hidden
          ${className}
        `}
        disabled={disabled || isLoading}
        {...props}
      >
        {/* Shimmer effect on hover */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          initial={{ x: '-100%' }}
          whileHover={{ x: '100%' }}
          transition={{ duration: 0.6 }}
        />
        
        {/* Content */}
        <span className="relative z-10 flex items-center gap-2">
          {isLoading && (
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          {children}
        </span>
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
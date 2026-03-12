import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  fullWidth?: boolean;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      icon,
      fullWidth = false,
      helperText,
      className = '',
      type = 'text',
      ...props
    },
    ref
  ) => {
    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {/* Label */}
        {label && (
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {/* Input Container */}
        <motion.div 
          className="relative group"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Icon */}
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-purple-600 transition-colors duration-200">
              {icon}
            </div>
          )}

          {/* Input Field */}
          <input
            ref={ref}
            type={type}
            className={`
              block w-full
              ${icon ? 'pl-12' : 'pl-4'}
              pr-4 py-3
              bg-white
              border-2 rounded-xl
              text-gray-900 placeholder-gray-400
              focus:outline-none 
              focus:ring-4 focus:ring-purple-500/10
              disabled:bg-gray-50 disabled:cursor-not-allowed
              disabled:text-gray-500
              transition-all duration-200
              ${error 
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' 
                : 'border-gray-200 focus:border-purple-500 hover:border-gray-300'
              }
              shadow-sm
              hover:shadow-md
              focus:shadow-lg
              ${className}
            `}
            {...props}
          />

          {/* Focus ring effect */}
          <div className={`
            absolute inset-0 rounded-xl pointer-events-none
            transition-opacity duration-200
            ${error ? 'ring-2 ring-red-500/20' : 'ring-0'}
          `} />
        </motion.div>

        {/* Helper Text */}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-gray-500">
            {helperText}
          </p>
        )}

        {/* Error Message */}
        {error && (
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1.5 text-sm text-red-600 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
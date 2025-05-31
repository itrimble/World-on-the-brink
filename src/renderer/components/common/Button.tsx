import React, { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * Defines the visual style variants for the button.
 * - `primary`: Main action button.
 * - `secondary`: Less prominent action.
 * - `danger`: For destructive actions (e.g., delete).
 * - `ghost`: Transparent button with a border, often used for tertiary actions.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

/**
 * Defines the size variants for the button.
 * - `sm`: Small size.
 * - `md`: Medium (default) size.
 * - `lg`: Large size.
 */
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Props for the Button component.
 * Extends standard HTMLButtonElement attributes.
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The content to display inside the button. */
  children?: ReactNode;
  /** Visual style of the button. Defaults to `primary`. */
  variant?: ButtonVariant;
  /** Size of the button. Defaults to `md`. */
  size?: ButtonSize;
  /** If `true`, displays a loading spinner and disables the button. Defaults to `false`. */
  isLoading?: boolean;
  /** Optional icon element to display to the left of the button text. */
  leftIcon?: React.ReactElement;
  /** Optional icon element to display to the right of the button text. */
  rightIcon?: React.ReactElement;
  /** Additional CSS classes to apply to the button. */
  className?: string;
  /** Accessible label for the button, especially important for icon-only buttons. */
  'aria-label'?: string;
}

/**
 * A versatile button component that supports different visual styles, sizes,
 * loading states, and optional icons. It aims to provide a consistent look and
 * feel for button elements across the application.
 *
 * It leverages Tailwind CSS for styling and is designed to be easily customizable
 * through its props. Standard button attributes like `onClick`, `disabled`, `type`, etc.,
 * can be passed directly.
 */
const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false, // Standard HTML attribute, can be overridden by isLoading
  leftIcon,
  rightIcon,
  className = '', // User-provided additional classes
  ...props // Other standard button attributes
}) => {
  // Base styles applicable to all button variants and sizes.
  const baseStyles = `
    font-semibold rounded-md 
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-opacity-75 
    transition-colors duration-150 ease-in-out 
    inline-flex items-center justify-center
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  // Style definitions for each button variant.
  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-gray-100 focus:ring-gray-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    ghost: 'bg-transparent hover:bg-gray-700 text-gray-300 focus:ring-gray-500 border border-gray-600 hover:border-gray-500',
  };

  // Style definitions for each button size.
  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  // Styles applied when the button is in a loading or explicitly disabled state.
  // Note: `disabled:` prefix in `baseStyles` handles this for non-isLoading explicit disable.
  // This const is more for the isLoading case or if we need specific styles beyond `opacity-50 cursor-not-allowed`.
  // const explicitDisabledStyles = (disabled || isLoading) ? 'opacity-50 cursor-not-allowed' : '';

  // Combine all style strings.
  // The `trim()` and `replace(/\s+/g, ' ')` ensure clean class strings.
  const combinedClassName = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${className} 
  `.trim().replace(/\s+/g, ' ');

  return (
    <button
      className={combinedClassName}
      // The button is disabled if explicitly set so, or if it's in a loading state.
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        // Simple SVG spinner for loading state.
        <svg 
          className="animate-spin h-5 w-5 mr-3" 
          // If button has text, mr-3 is good. If icon-only, might need adjustment.
          // For icon-only loading, spinner might replace the icon or children.
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {/* Render left icon if provided and not in loading state */}
      {leftIcon && !isLoading && <span className={children ? "mr-2" : ""}>{leftIcon}</span>}
      {/* Render button children (text or other elements) */}
      {children}
      {/* Render right icon if provided and not in loading state */}
      {rightIcon && !isLoading && <span className={children ? "ml-2" : ""}>{rightIcon}</span>}
    </button>
  );
};

export default Button;
```

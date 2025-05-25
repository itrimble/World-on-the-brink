import React from 'react';

/**
 * Props for the ErrorMessage component.
 */
export interface ErrorMessageProps {
  /** 
   * The error message text to display. 
   * If `null`, `undefined`, or an empty string, the component will not render. 
   */
  message: string | null | undefined;
  /** Optional CSS classes to apply to the error message container. */
  className?: string;
}

/**
 * A reusable component for displaying error messages.
 * It renders a styled container with the provided error message.
 * If the message is null, undefined, or empty, the component renders nothing.
 * This helps in standardizing how errors are shown to the user.
 */
const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, className = '' }) => {
  // Do not render the component if the message is null, undefined, or empty.
  if (!message) {
    return null;
  }

  // Base styles for the error message container.
  // Uses Tailwind CSS for styling.
  const baseStyles = "bg-red-600 hover:bg-red-700 text-white p-3 rounded-md my-3 text-sm shadow";

  const combinedClassName = `${baseStyles} ${className}`.trim();

  return (
    <div 
      className={combinedClassName} 
      role="alert" // Accessibility: indicates this is an alert message
    >
      <p>{message}</p>
    </div>
  );
};

export default ErrorMessage;
```

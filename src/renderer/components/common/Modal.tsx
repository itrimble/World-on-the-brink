import React, { ReactNode, useEffect } from 'react';

/**
 * Props for the Modal component.
 */
export interface ModalProps {
  /** The title displayed at the top of the modal. */
  title: string;
  /** Controls whether the modal is visible or hidden. */
  isOpen: boolean;
  /** Callback function invoked when the modal is requested to close (e.g., by clicking the close button or pressing Escape). */
  onClose: () => void;
  /** The main content of the modal. Can be any valid React node. */
  children: ReactNode;
  /** Optional React node to render in the footer of the modal, typically used for action buttons (e.g., Save, Cancel). */
  footer?: ReactNode;
  /** Optional CSS class name to apply to the modal's main content panel for custom styling. */
  className?: string;
  /** 
   * Optional maximum width for the modal. Uses Tailwind CSS max-width classes (e.g., 'max-w-md', 'max-w-xl', 'max-w-4xl').
   * Defaults to 'max-w-md'.
   */
  maxWidth?: string;
}

/**
 * A reusable Modal component for displaying dialogs or pop-ups.
 * It includes features like a title bar, a close button, content area, and an optional footer.
 * The modal's visibility is controlled by the `isOpen` prop.
 * Pressing the Escape key will also trigger the `onClose` callback.
 */
const Modal: React.FC<ModalProps> = ({
  title,
  isOpen,
  onClose,
  children,
  footer,
  className = '',
  maxWidth = 'max-w-md', // Default max width
}) => {
  // Effect to handle Escape key press for closing the modal.
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    // Cleanup function to remove the event listener when the modal is closed or the component unmounts.
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]); // Dependencies for the effect

  // Do not render the modal if it's not open.
  if (!isOpen) {
    return null;
  }

  // Base styles for the modal overlay (the backdrop).
  const overlayStyles = "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4";
  
  // Base styles for the modal panel itself.
  // Includes responsive width, max height with scroll, and styling.
  const panelBaseStyles = `bg-gray-800 text-white rounded-lg shadow-xl w-full overflow-hidden flex flex-col`;
  const panelLayoutAndSpacing = `p-5 sm:p-6`; // Padding for content

  // Combine base styles with user-provided className and maxWidth.
  const combinedPanelClassName = `${panelBaseStyles} ${maxWidth} ${className}`.trim();

  return (
    <div className={overlayStyles} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      {/* Modal Panel */}
      <div className={combinedPanelClassName}>
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-gray-700">
          <h2 id="modal-title" className="text-xl font-semibold text-gray-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl p-1 -mr-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        {/* Modal Body (Content) */}
        {/* Apply max-h for scrollability if content is too long */}
        <div className={`mb-5 overflow-y-auto max-h-[calc(100vh-15rem)] custom-scrollbar ${panelLayoutAndSpacing}`}>
          {children}
        </div>

        {/* Modal Footer (Optional) */}
        {footer && (
          <div className={`mt-auto pt-5 border-t border-gray-700 flex justify-end space-x-3 ${panelLayoutAndSpacing}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
```

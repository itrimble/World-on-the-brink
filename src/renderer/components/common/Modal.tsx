import React, { ReactNode, useEffect, useRef } from 'react';

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
 * Implements focus trapping for accessibility: when the modal is open, tab navigation is restricted
 * to elements within the modal. Focus is returned to the previously focused element when closed.
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
  const modalPanelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  // Effect for Escape key handling and focus management when modal opens/closes.
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      // Store the currently focused element when modal opens
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement;
      // Move focus to the modal panel (or first focusable element)
      // Adding a slight delay can help ensure the modal is fully rendered.
      requestAnimationFrame(() => {
        modalPanelRef.current?.focus(); 
      });
    } else {
      // When modal closes, return focus to the previously focused element
      previouslyFocusedElementRef.current?.focus();
    }

    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  // Effect for focus trapping within the modal.
  useEffect(() => {
    if (!isOpen || !modalPanelRef.current) return;

    const panel = modalPanelRef.current;
    // Query for all focusable elements within the modal panel.
    // This selector can be adjusted based on what elements are considered focusable.
    const focusableElements = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null); // Filter out disabled or hidden elements

    if (focusableElements.length === 0) return; // No focusable elements found

    const firstFocusableElement = focusableElements[0];
    const lastFocusableElement = focusableElements[focusableElements.length - 1];
    
    // Set initial focus to the first focusable element if panel itself isn't focused or if preferred.
    // The previous effect already focuses modalPanelRef.current, which is good if it has tabindex="-1".
    // If you want to focus the first interactive element directly:
    // requestAnimationFrame(() => firstFocusableElement.focus());


    const handleTabKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) { // Shift + Tab
          if (document.activeElement === firstFocusableElement) {
            lastFocusableElement.focus();
            event.preventDefault();
          }
        } else { // Tab
          if (document.activeElement === lastFocusableElement) {
            firstFocusableElement.focus();
            event.preventDefault();
          }
        }
      }
    };

    panel.addEventListener('keydown', handleTabKeyPress);
    return () => {
      panel.removeEventListener('keydown', handleTabKeyPress);
    };
  }, [isOpen]);


  if (!isOpen) {
    return null;
  }

  const overlayStyles = "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4";
  const panelBaseStyles = `bg-gray-800 text-white rounded-lg shadow-xl w-full overflow-hidden flex flex-col`;
  const panelLayoutAndSpacing = `p-5 sm:p-6`;
  const combinedPanelClassName = `${panelBaseStyles} ${maxWidth} ${className}`.trim();

  return (
    <div 
      className={overlayStyles} 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="modal-title"
      // onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} // Optional: close on overlay click
    >
      {/* Modal Panel: Make it focusable for initial focus setting */}
      <div 
        ref={modalPanelRef} 
        className={combinedPanelClassName} 
        tabIndex={-1} // Allows the panel itself to be programmatically focused
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-gray-700">
          <h2 id="modal-title" className="text-xl font-semibold text-gray-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl p-1 -mr-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            aria-label="Close modal" // Existing aria-label is good
          >
            &times;
          </button>
        </div>

        {/* Modal Body (Content) */}
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

import { ReactNode } from 'react';

interface CardProps {
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Card({
  title,
  icon,
  children,
  footer,
  className = '',
}: CardProps): React.ReactElement {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}
    >
      {/* Header */}
      {title && (
        <div className="px-4 py-4 md:px-6 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
          {icon && <div className="text-gray-600 dark:text-gray-400">{icon}</div>}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-4 md:px-6">{children}</div>

      {/* Footer */}
      {footer && (
        <div className="px-4 py-4 md:px-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          {footer}
        </div>
      )}
    </div>
  );
}

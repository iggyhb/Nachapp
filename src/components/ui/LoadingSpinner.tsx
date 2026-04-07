interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export function LoadingSpinner({
  size = 'md',
  text,
}: LoadingSpinnerProps): React.ReactElement {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizeClasses[size]} border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin`}></div>
      {text && <p className="text-gray-600 dark:text-gray-400">{text}</p>}
    </div>
  );
}

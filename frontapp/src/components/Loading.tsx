import { Sparkles } from 'lucide-react';

interface LoadingProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function Loading({ text = 'Loading...', size = 'md' }: LoadingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className="flex items-center justify-center gap-3">
      <Sparkles className={`${sizeClasses[size]} text-accent animate-spin`} />
      <span className={`${textSizeClasses[size]} text-ink/60 font-medium`}>
        {text}
      </span>
    </div>
  );
}
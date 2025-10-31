import React from 'react';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, src, size = 'md', className = '' }) => {
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
  };

  if (src) {
    return (
      <div className={`relative inline-block ${sizeClasses[size]} ${className}`}>
        <img
          src={src}
          alt={name}
          className="rounded-full object-cover w-full h-full"
        />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground font-medium ${sizeClasses[size]} ${className}`}
    >
      {getInitials(name)}
    </div>
  );
};

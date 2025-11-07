import React from 'react';
import logoLight from '../../assets/logos/Asset 13.svg';
import logoDark from '../../assets/logos/Asset 14.svg';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  theme?: 'light' | 'dark';
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = false, className = '', theme = 'light' }) => {
  const currentTheme = theme;
  
  const sizeClasses = {
    sm: { icon: 'w-24 h-24', text: 'text-lg' },
    md: { icon: 'w-28 h-28', text: 'text-xl' },
    lg: { icon: 'w-40 h-40', text: 'text-2xl' },
    xl: { icon: 'w-48 h-48', text: 'text-3xl' }
  };

  const textColor = currentTheme === 'dark' ? 'text-white' : 'text-black';
  const logoImage = currentTheme === 'dark' ? logoDark : logoLight;

  return (
    <div className={`flex items-center justify-center gap-2 leading-none ${className}`}>
      {/* Logo Icon */}
      <div className={`${sizeClasses[size].icon} relative flex-shrink-0 flex items-center justify-center`}>
        <img 
          src={logoImage} 
          alt="PersonaPro Logo" 
          className="w-full h-full object-contain"
        />
      </div>
      
      {/* Logo Text */}
      {showText && (
        <span className={`${sizeClasses[size].text} font-bold font-serif ${textColor} leading-none`}>
          PersonaPro
        </span>
      )}
    </div>
  );
};


'use client';

import { ReactNode } from 'react';

interface ScrollToTopButtonProps {
  onClick: () => void;
  children: ReactNode;
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
}

export function ScrollToTopButton({ 
  onClick, 
  children, 
  className, 
  type = 'button',
  disabled = false 
}: ScrollToTopButtonProps) {
  function handleClick() {
    // Reset window scroll before navigation
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
    onClick();
  }

  return (
    <button 
      type={type}
      onClick={handleClick}
      className={className}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

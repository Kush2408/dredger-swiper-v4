import React from 'react';

interface SkeletonProps {
  variant?: 'text' | 'title' | 'avatar' | 'button' | 'card';
  className?: string;
  width?: string;
  height?: string;
}

export default function Skeleton({ 
  variant = 'text', 
  className = '',
  width,
  height 
}: SkeletonProps) {
  const baseClasses = 'animate-shimmer rounded';
  
  const variantClasses = {
    text: 'h-4',
    title: 'h-6',
    avatar: 'w-10 h-10 rounded-full',
    button: 'h-8',
    card: 'h-32'
  };

  const classes = [
    baseClasses,
    variantClasses[variant],
    className
  ].filter(Boolean).join(' ');

  const style: React.CSSProperties = {};
  if (width) style.width = width;
  if (height) style.height = height;

  return <div className={classes} style={style}></div>;
}

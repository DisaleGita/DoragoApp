import React from 'react';

export type BadgeVariant = 'teal' | 'slate' | 'indigo' | 'amber' | 'emerald' | 'rose' | 'warning' | 'purple';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'slate',
  size = 'sm',
  icon,
  className = '',
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  const variantStyles = {
    teal: 'bg-teal-500/10 text-teal-300 border border-teal-500/20',
    slate: 'bg-slate-800/80 text-slate-300 border border-slate-700/60',
    indigo: 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20',
    amber: 'bg-amber-500/10 text-amber-300 border border-amber-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20',
    rose: 'bg-rose-500/10 text-rose-300 border border-rose-500/20',
    warning: 'bg-amber-500/15 text-amber-200 border border-amber-500/30',
    purple: 'bg-purple-500/10 text-purple-300 border border-purple-500/20',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md whitespace-nowrap leading-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {icon}
      <span>{children}</span>
    </span>
  );
};

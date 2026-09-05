import React from 'react';
import { Compass, Sparkles } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No trips yet',
  description = 'Create your first trip or import a travel confirmation and Dorago will keep everything organized for you.',
  icon,
  primaryActionLabel = 'Create Trip',
  onPrimaryAction,
  secondaryActionLabel = 'Import Travel Plans',
  onSecondaryAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 my-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700/80 flex items-center justify-center text-teal-400 mb-4 shadow-inner">
        {icon || <Compass size={28} />}
      </div>
      <h3 className="text-lg font-bold text-slate-100 mb-1.5">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">{description}</p>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
        {onPrimaryAction && (
          <Button variant="primary" size="md" className="w-full" onClick={onPrimaryAction}>
            {primaryActionLabel}
          </Button>
        )}
        {onSecondaryAction && (
          <Button
            variant="secondary"
            size="md"
            className="w-full"
            leftIcon={<Sparkles size={14} className="text-teal-400" />}
            onClick={onSecondaryAction}
          >
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  );
};

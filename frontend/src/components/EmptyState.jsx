import React from 'react';
import { Button } from '@/components/ui/button';

export const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action,
  actionLabel 
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
        <Icon className="w-12 h-12 text-gray-400 dark:text-gray-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-center mb-6 max-w-sm">
        {description}
      </p>
      {action && actionLabel && (
        <Button onClick={action}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

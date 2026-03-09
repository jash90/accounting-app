import type * as React from 'react';

import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { Circle } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

interface RadioGroupProps extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> {
  ref?: React.Ref<React.ElementRef<typeof RadioGroupPrimitive.Root>>;
}

function RadioGroup({ className, ref, ...props }: RadioGroupProps) {
  return <RadioGroupPrimitive.Root className={cn('grid gap-2', className)} {...props} ref={ref} />;
}

interface RadioGroupItemProps extends React.ComponentPropsWithoutRef<
  typeof RadioGroupPrimitive.Item
> {
  ref?: React.Ref<React.ElementRef<typeof RadioGroupPrimitive.Item>>;
}

function RadioGroupItem({ className, ref, ...props }: RadioGroupItemProps) {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        'border-primary text-primary focus-visible:ring-ring aspect-square h-4 w-4 rounded-full border shadow focus:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <Circle className="h-3.5 w-3.5 fill-current" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };

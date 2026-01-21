import { Link } from 'react-router-dom';

import { type LucideIcon, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';

export interface NavigationCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  gradient?: string;
  buttonText?: string;
  buttonVariant?: 'default' | 'outline';
  className?: string;
}

export function NavigationCard({
  title,
  description,
  icon: Icon,
  href,
  gradient = 'bg-apptax-gradient',
  buttonText = 'Otwórz',
  buttonVariant = 'default',
  className,
}: NavigationCardProps) {
  return (
    <Card className={cn('flex flex-1 flex-col', className)}>
      <CardHeader className="flex-1 pb-6">
        <div className="flex items-center gap-3 pb-2">
          <div className={cn('text-white p-3 rounded-xl', gradient)}>
            <Icon className="h-6 w-6" />
          </div>
          <CardTitle className="text-apptax-navy">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link to={href}>
          <Button
            className={cn(
              'w-full',
              buttonVariant === 'default' && 'bg-apptax-blue hover:bg-apptax-blue/90'
            )}
            variant={buttonVariant}
          >
            {buttonText}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

import { NavLink, useLocation } from 'react-router-dom';

import { useMobileMenu } from '@/contexts/navigation-context';
import { cn } from '@/lib/utils/cn';

import type { NavItem } from '../sidebar/types';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../ui/sheet';

interface MobileNavigationProps {
  title: string;
  navItems: NavItem[];
}

export function MobileNavigation({ title, navItems }: MobileNavigationProps) {
  const { isOpen, close } = useMobileMenu();
  const location = useLocation();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent side="left" className="w-[280px] bg-apptax-navy p-0">
        <SheetHeader className="border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
            <img src="/apptax-logomark.svg" alt="AppTax" className="h-8 w-8" />
            <div>
              <SheetTitle className="text-left text-base font-semibold text-white">
                {title}
              </SheetTitle>
              <SheetDescription className="sr-only">Nawigacja mobilna</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <nav className="flex-1 space-y-1 px-2 py-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;

            return (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={close}
                className={cn(
                  'flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-apptax-blue/20 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-apptax-teal" />
            <span className="text-xs text-white/50">Zasilany AI</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

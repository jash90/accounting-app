import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthContext } from '@/contexts/auth-context';
import { useAdminContext, useSwitchContext, useResetContext } from '@/lib/hooks/use-admin-context';
import { Building2, ChevronDown, TestTube2, Shield, Loader2, Check } from 'lucide-react';
import { UserRole } from '@/types/enums';
import { cn } from '@/lib/utils/cn';

/**
 * Komponent przełącznika kontekstu firmy dla administratorów.
 * Pozwala adminowi przełączyć się między System Admin a Firmą Testową.
 */
export function CompanyContextSwitcher() {
  const { user } = useAuthContext();
  const { data: contextData, isLoading } = useAdminContext();
  const switchContext = useSwitchContext();
  const resetContext = useResetContext();

  // Tylko dla administratorów
  if (!user || user.role !== UserRole.ADMIN) {
    return null;
  }

  const currentContext = contextData?.currentContext;
  const availableContexts = contextData?.availableContexts || [];
  const isInTestMode = currentContext?.isTestCompany ?? false;
  const isSwitching = switchContext.isPending || resetContext.isPending;

  const handleContextSwitch = (companyId: string) => {
    if (currentContext?.companyId === companyId) return;

    const targetContext = availableContexts.find(c => c.companyId === companyId);
    if (targetContext?.isSystemCompany) {
      resetContext.mutate();
    } else {
      switchContext.mutate({ companyId });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Ładowanie...</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-10 gap-2 px-3 font-medium transition-colors',
            isInTestMode
              ? 'border-amber-500/50 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-500'
              : 'border-gray-200 hover:bg-apptax-soft-teal'
          )}
          disabled={isSwitching}
        >
          {isSwitching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isInTestMode ? (
            <TestTube2 className="h-4 w-4" />
          ) : (
            <Shield className="h-4 w-4 text-apptax-blue" />
          )}
          <span className="max-w-[150px] truncate">
            {currentContext?.companyName || 'System Admin'}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 shadow-apptax-md" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold text-apptax-navy">Kontekst firmy</p>
            <p className="text-xs text-muted-foreground">
              Przełącz kontekst, aby testować funkcje firmy
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableContexts.map((context) => {
          const isActive = currentContext?.companyId === context.companyId;
          const isSystem = context.isSystemCompany;
          const isTest = context.isTestCompany;

          return (
            <DropdownMenuItem
              key={context.companyId}
              onClick={() => handleContextSwitch(context.companyId)}
              className={cn(
                'cursor-pointer flex items-center justify-between',
                isActive && 'bg-apptax-soft-teal',
                !isActive && 'hover:bg-apptax-soft-teal'
              )}
              disabled={isSwitching}
            >
              <div className="flex items-center gap-2">
                {isSystem ? (
                  <Shield className="h-4 w-4 text-apptax-blue" />
                ) : isTest ? (
                  <TestTube2 className="h-4 w-4 text-amber-600" />
                ) : (
                  <Building2 className="h-4 w-4 text-apptax-navy" />
                )}
                <span className="text-sm">{context.companyName}</span>
              </div>
              <div className="flex items-center gap-2">
                {isTest && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 border-amber-500 text-amber-600 bg-amber-50"
                  >
                    Test
                  </Badge>
                )}
                {isActive && <Check className="h-4 w-4 text-apptax-teal" />}
              </div>
            </DropdownMenuItem>
          );
        })}
        {isInTestMode && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-2">
              <div className="flex items-start gap-2 p-2 rounded-md bg-amber-50 border border-amber-200">
                <TestTube2 className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700">
                  Jesteś w trybie testowym. Wszystkie dane biznesowe są filtrowane przez Firmę Testową.
                </p>
              </div>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

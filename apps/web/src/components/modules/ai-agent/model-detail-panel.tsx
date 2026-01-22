import { Star, GitCompare, Check, Eye, Wrench, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { type OpenRouterModelDto } from '@/types/dtos';

interface ModelDetailPanelProps {
  model: OpenRouterModelDto | null;
  onSelect: () => void;
  onAddToCompare: () => void;
  onToggleFavorite: () => void;
  isFavorite: boolean;
  isInComparison: boolean;
  comparisonFull: boolean;
}

function formatCost(costPer1k: number): string {
  if (costPer1k === 0) return 'Darmowy';
  if (costPer1k < 0.01) return `$${(costPer1k * 1000).toFixed(4)}/1M`;
  if (costPer1k < 1) return `$${costPer1k.toFixed(4)}/1K`;
  return `$${costPer1k.toFixed(2)}/1K`;
}

function formatContextWindow(tokens: number): string {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`;
  return `${tokens}`;
}

function getCostTier(costPer1kInput: number): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
} {
  if (costPer1kInput === 0) return { label: 'Darmowy', variant: 'secondary' };
  if (costPer1kInput < 0.5) return { label: 'Bardzo niski', variant: 'secondary' };
  if (costPer1kInput < 2) return { label: 'Niski', variant: 'outline' };
  if (costPer1kInput < 5) return { label: 'Średni', variant: 'default' };
  if (costPer1kInput < 10) return { label: 'Wysoki', variant: 'destructive' };
  return { label: 'Bardzo wysoki', variant: 'destructive' };
}

export function ModelDetailPanel({
  model,
  onSelect,
  onAddToCompare,
  onToggleFavorite,
  isFavorite,
  isInComparison,
  comparisonFull,
}: ModelDetailPanelProps) {
  if (!model) {
    return (
      <div className="border-border flex w-2/5 items-center justify-center border-l p-6">
        <div className="text-muted-foreground text-center">
          <p className="text-sm">Wybierz model, aby zobaczyć szczegóły</p>
        </div>
      </div>
    );
  }

  const costTier = getCostTier(model.costPer1kInput);

  return (
    <div className="border-border flex w-2/5 flex-col border-l">
      {/* Header */}
      <div className="border-border border-b p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-foreground truncate text-lg font-semibold">{model.name}</h3>
            <p className="text-muted-foreground text-sm">{model.provider}</p>
          </div>
          <button
            type="button"
            onClick={onToggleFavorite}
            className={cn(
              'rounded-lg p-2 transition-colors',
              isFavorite
                ? 'text-yellow-500 hover:bg-yellow-500/10'
                : 'text-muted-foreground hover:bg-muted'
            )}
            title={isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
          >
            <Star className={cn('h-5 w-5', isFavorite && 'fill-current')} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Description */}
        {model.description && (
          <div>
            <p className="text-muted-foreground text-sm">{model.description}</p>
          </div>
        )}

        {/* Cost */}
        <div className="space-y-2">
          <h4 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Cennik
          </h4>
          <div className="flex items-center gap-2">
            <Badge variant={costTier.variant}>{costTier.label}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-muted/50 rounded-md p-2">
              <p className="text-muted-foreground text-xs">Wejście</p>
              <p className="font-medium">{formatCost(model.costPer1kInput)}</p>
            </div>
            <div className="bg-muted/50 rounded-md p-2">
              <p className="text-muted-foreground text-xs">Wyjście</p>
              <p className="font-medium">{formatCost(model.costPer1kOutput)}</p>
            </div>
          </div>
        </div>

        {/* Context & Tokens */}
        <div className="space-y-2">
          <h4 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Limity
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-muted/50 rounded-md p-2">
              <p className="text-muted-foreground text-xs">Okno kontekstu</p>
              <p className="font-medium">{formatContextWindow(model.contextWindow)} tokenów</p>
            </div>
            <div className="bg-muted/50 rounded-md p-2">
              <p className="text-muted-foreground text-xs">Maks. wyjście</p>
              <p className="font-medium">{formatContextWindow(model.maxOutputTokens)} tokenów</p>
            </div>
          </div>
        </div>

        {/* Capabilities */}
        <div className="space-y-2">
          <h4 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Możliwości
          </h4>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={model.supportsVision ? 'default' : 'outline'}
              className={cn('gap-1', !model.supportsVision && 'text-muted-foreground')}
            >
              <Eye className="h-3 w-3" />
              Wizja
              {model.supportsVision && <Check className="ml-0.5 h-3 w-3" />}
            </Badge>
            <Badge
              variant={model.supportsFunctionCalling ? 'default' : 'outline'}
              className={cn('gap-1', !model.supportsFunctionCalling && 'text-muted-foreground')}
            >
              <Wrench className="h-3 w-3" />
              Narzędzia
              {model.supportsFunctionCalling && <Check className="ml-0.5 h-3 w-3" />}
            </Badge>
          </div>
        </div>

        {/* Model ID */}
        <div className="space-y-2">
          <h4 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            ID modelu
          </h4>
          <code className="bg-muted/50 text-muted-foreground block rounded-md p-2 text-xs break-all">
            {model.id}
          </code>
        </div>
      </div>

      {/* Actions */}
      <div className="border-border space-y-2 border-t p-4">
        <Button
          type="button"
          onClick={onSelect}
          className="bg-apptax-blue hover:bg-apptax-blue/90 w-full"
        >
          <Zap className="mr-2 h-4 w-4" />
          Wybierz model
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onAddToCompare}
          disabled={comparisonFull && !isInComparison}
          className="w-full"
        >
          <GitCompare className="mr-2 h-4 w-4" />
          {isInComparison ? 'Usuń z porównania' : 'Dodaj do porównania'}
          {!isInComparison && comparisonFull && ' (Maks. 3)'}
        </Button>
      </div>
    </div>
  );
}

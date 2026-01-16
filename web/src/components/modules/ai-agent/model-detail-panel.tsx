import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, GitCompare, Check, Eye, Wrench, Zap } from 'lucide-react';
import { OpenRouterModelDto } from '@/types/dtos';
import { cn } from '@/lib/utils/cn';

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

function getCostTier(costPer1kInput: number): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
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
      <div className="w-2/5 border-l border-border p-6 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">Wybierz model, aby zobaczyć szczegóły</p>
        </div>
      </div>
    );
  }

  const costTier = getCostTier(model.costPer1kInput);

  return (
    <div className="w-2/5 border-l border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-foreground truncate">
              {model.name}
            </h3>
            <p className="text-sm text-muted-foreground">{model.provider}</p>
          </div>
          <button
            type="button"
            onClick={onToggleFavorite}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isFavorite
                ? 'text-yellow-500 hover:bg-yellow-500/10'
                : 'text-muted-foreground hover:bg-muted'
            )}
            title={isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
          >
            <Star className={cn('w-5 h-5', isFavorite && 'fill-current')} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Description */}
        {model.description && (
          <div>
            <p className="text-sm text-muted-foreground">{model.description}</p>
          </div>
        )}

        {/* Cost */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Cennik
          </h4>
          <div className="flex items-center gap-2">
            <Badge variant={costTier.variant}>{costTier.label}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-2 rounded-md bg-muted/50">
              <p className="text-xs text-muted-foreground">Wejście</p>
              <p className="font-medium">{formatCost(model.costPer1kInput)}</p>
            </div>
            <div className="p-2 rounded-md bg-muted/50">
              <p className="text-xs text-muted-foreground">Wyjście</p>
              <p className="font-medium">{formatCost(model.costPer1kOutput)}</p>
            </div>
          </div>
        </div>

        {/* Context & Tokens */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Limity
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-2 rounded-md bg-muted/50">
              <p className="text-xs text-muted-foreground">Okno kontekstu</p>
              <p className="font-medium">{formatContextWindow(model.contextWindow)} tokenów</p>
            </div>
            <div className="p-2 rounded-md bg-muted/50">
              <p className="text-xs text-muted-foreground">Maks. wyjście</p>
              <p className="font-medium">{formatContextWindow(model.maxOutputTokens)} tokenów</p>
            </div>
          </div>
        </div>

        {/* Capabilities */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Możliwości
          </h4>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={model.supportsVision ? 'default' : 'outline'}
              className={cn(
                'gap-1',
                !model.supportsVision && 'text-muted-foreground'
              )}
            >
              <Eye className="w-3 h-3" />
              Wizja
              {model.supportsVision && <Check className="w-3 h-3 ml-0.5" />}
            </Badge>
            <Badge
              variant={model.supportsFunctionCalling ? 'default' : 'outline'}
              className={cn(
                'gap-1',
                !model.supportsFunctionCalling && 'text-muted-foreground'
              )}
            >
              <Wrench className="w-3 h-3" />
              Narzędzia
              {model.supportsFunctionCalling && <Check className="w-3 h-3 ml-0.5" />}
            </Badge>
          </div>
        </div>

        {/* Model ID */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            ID modelu
          </h4>
          <code className="block text-xs bg-muted/50 p-2 rounded-md text-muted-foreground break-all">
            {model.id}
          </code>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <Button
          type="button"
          onClick={onSelect}
          className="w-full bg-apptax-blue hover:bg-apptax-blue/90"
        >
          <Zap className="w-4 h-4 mr-2" />
          Wybierz model
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onAddToCompare}
          disabled={comparisonFull && !isInComparison}
          className="w-full"
        >
          <GitCompare className="w-4 h-4 mr-2" />
          {isInComparison ? 'Usuń z porównania' : 'Dodaj do porównania'}
          {!isInComparison && comparisonFull && ' (Maks. 3)'}
        </Button>
      </div>
    </div>
  );
}

import { ArrowLeft, Check, Eye, Wrench, X, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { type OpenRouterModelDto } from '@/types/dtos';

interface ModelComparisonViewProps {
  models: OpenRouterModelDto[];
  onSelect: (modelId: string) => void;
  onRemove: (modelId: string) => void;
  onBack: () => void;
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

function getCostTierColor(costPer1kInput: number): string {
  if (costPer1kInput === 0) return 'text-green-600';
  if (costPer1kInput < 0.5) return 'text-green-600';
  if (costPer1kInput < 2) return 'text-blue-600';
  if (costPer1kInput < 5) return 'text-yellow-600';
  if (costPer1kInput < 10) return 'text-orange-600';
  return 'text-red-600';
}

function ComparisonRow({
  label,
  values,
  highlight = false,
}: {
  label: string;
  values: React.ReactNode[];
  highlight?: boolean;
}) {
  return (
    <tr className={cn(highlight && 'bg-muted/30')}>
      <td className="text-muted-foreground border-border border-r px-4 py-3 text-sm font-medium whitespace-nowrap">
        {label}
      </td>
      {values.map((value, columnIndex) => (
        <td
          key={`${label}-col-${columnIndex}`}
          className="border-border border-r px-4 py-3 text-center text-sm last:border-r-0"
        >
          {value}
        </td>
      ))}
    </tr>
  );
}

export function ModelComparisonView({
  models,
  onSelect,
  onRemove,
  onBack,
}: ModelComparisonViewProps) {
  if (models.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Nie wybrano modeli do porównania</p>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Wróć do przeglądania
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="border-border bg-muted/30 flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Wstecz
          </Button>
          <h3 className="text-lg font-semibold">Porównaj modele ({models.length})</h3>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/50 sticky top-0 z-10">
              <th className="text-muted-foreground border-border w-[150px] border-r px-4 py-3 text-left text-xs font-medium tracking-wider uppercase">
                Właściwość
              </th>
              {models.map((model) => (
                <th
                  key={model.id}
                  className="border-border min-w-[200px] border-r px-4 py-3 last:border-r-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 text-left">
                      <p className="text-foreground truncate font-semibold">{model.name}</p>
                      <p className="text-muted-foreground text-xs font-normal">{model.provider}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(model.id)}
                      className="hover:bg-muted flex-shrink-0 rounded p-1 transition-colors"
                      title="Usuń z porównania"
                    >
                      <X className="text-muted-foreground h-4 w-4" />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            <ComparisonRow
              label="Koszt wejścia"
              values={models.map((m) => (
                <span key={m.id} className={getCostTierColor(m.costPer1kInput)}>
                  {formatCost(m.costPer1kInput)}
                </span>
              ))}
              highlight
            />
            <ComparisonRow
              label="Koszt wyjścia"
              values={models.map((m) => (
                <span key={m.id} className={getCostTierColor(m.costPer1kOutput)}>
                  {formatCost(m.costPer1kOutput)}
                </span>
              ))}
            />
            <ComparisonRow
              label="Okno kontekstu"
              values={models.map((m) => (
                <span key={m.id} className="font-medium">
                  {formatContextWindow(m.contextWindow)}
                </span>
              ))}
              highlight
            />
            <ComparisonRow
              label="Maks. wyjście"
              values={models.map((m) => (
                <span key={m.id}>{formatContextWindow(m.maxOutputTokens)}</span>
              ))}
            />
            <ComparisonRow
              label="Wizja"
              values={models.map((m) =>
                m.supportsVision ? (
                  <Badge key={m.id} variant="default" className="gap-1">
                    <Eye className="h-3 w-3" />
                    <Check className="h-3 w-3" />
                  </Badge>
                ) : (
                  <Badge key={m.id} variant="outline" className="text-muted-foreground">
                    <X className="h-3 w-3" />
                  </Badge>
                )
              )}
              highlight
            />
            <ComparisonRow
              label="Narzędzia/Funkcje"
              values={models.map((m) =>
                m.supportsFunctionCalling ? (
                  <Badge key={m.id} variant="default" className="gap-1">
                    <Wrench className="h-3 w-3" />
                    <Check className="h-3 w-3" />
                  </Badge>
                ) : (
                  <Badge key={m.id} variant="outline" className="text-muted-foreground">
                    <X className="h-3 w-3" />
                  </Badge>
                )
              )}
            />
            <ComparisonRow
              label="ID modelu"
              values={models.map((m) => (
                <code key={m.id} className="bg-muted rounded px-1.5 py-0.5 text-xs break-all">
                  {m.id}
                </code>
              ))}
              highlight
            />
            {/* Select Actions */}
            <tr>
              <td className="border-border border-r px-4 py-4" />
              {models.map((model) => (
                <td key={model.id} className="border-border border-r px-4 py-4 last:border-r-0">
                  <Button
                    onClick={() => onSelect(model.id)}
                    className="bg-primary hover:bg-primary/90 w-full"
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Wybierz
                  </Button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

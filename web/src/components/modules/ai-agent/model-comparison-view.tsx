import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, X, Check, Eye, Wrench, Zap } from 'lucide-react';
import { OpenRouterModelDto } from '@/types/dtos';
import { cn } from '@/lib/utils/cn';

interface ModelComparisonViewProps {
  models: OpenRouterModelDto[];
  onSelect: (modelId: string) => void;
  onRemove: (modelId: string) => void;
  onBack: () => void;
}

function formatCost(costPer1k: number): string {
  if (costPer1k === 0) return 'Free';
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

export function ModelComparisonView({
  models,
  onSelect,
  onRemove,
  onBack,
}: ModelComparisonViewProps) {
  if (models.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No models selected for comparison</p>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Browse
          </Button>
        </div>
      </div>
    );
  }

  const ComparisonRow = ({
    label,
    values,
    highlight = false,
  }: {
    label: string;
    values: React.ReactNode[];
    highlight?: boolean;
  }) => (
    <tr className={cn(highlight && 'bg-muted/30')}>
      <td className="py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap border-r border-border">
        {label}
      </td>
      {values.map((value, i) => (
        <td key={i} className="py-3 px-4 text-sm text-center border-r border-border last:border-r-0">
          {value}
        </td>
      ))}
    </tr>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h3 className="text-lg font-semibold">Compare Models ({models.length})</h3>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/50 sticky top-0 z-10">
              <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-r border-border w-[150px]">
                Property
              </th>
              {models.map((model) => (
                <th key={model.id} className="py-3 px-4 border-r border-border last:border-r-0 min-w-[200px]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-left min-w-0">
                      <p className="font-semibold text-foreground truncate">{model.name}</p>
                      <p className="text-xs text-muted-foreground font-normal">{model.provider}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(model.id)}
                      className="p-1 rounded hover:bg-muted transition-colors flex-shrink-0"
                      title="Remove from comparison"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <ComparisonRow
              label="Input Cost"
              values={models.map((m) => (
                <span key={m.id} className={getCostTierColor(m.costPer1kInput)}>
                  {formatCost(m.costPer1kInput)}
                </span>
              ))}
              highlight
            />
            <ComparisonRow
              label="Output Cost"
              values={models.map((m) => (
                <span key={m.id} className={getCostTierColor(m.costPer1kOutput)}>
                  {formatCost(m.costPer1kOutput)}
                </span>
              ))}
            />
            <ComparisonRow
              label="Context Window"
              values={models.map((m) => (
                <span key={m.id} className="font-medium">{formatContextWindow(m.contextWindow)}</span>
              ))}
              highlight
            />
            <ComparisonRow
              label="Max Output"
              values={models.map((m) => (
                <span key={m.id}>{formatContextWindow(m.maxOutputTokens)}</span>
              ))}
            />
            <ComparisonRow
              label="Vision"
              values={models.map((m) => (
                m.supportsVision ? (
                  <Badge key={m.id} variant="default" className="gap-1">
                    <Eye className="w-3 h-3" />
                    <Check className="w-3 h-3" />
                  </Badge>
                ) : (
                  <Badge key={m.id} variant="outline" className="text-muted-foreground">
                    <X className="w-3 h-3" />
                  </Badge>
                )
              ))}
              highlight
            />
            <ComparisonRow
              label="Tools/Functions"
              values={models.map((m) => (
                m.supportsFunctionCalling ? (
                  <Badge key={m.id} variant="default" className="gap-1">
                    <Wrench className="w-3 h-3" />
                    <Check className="w-3 h-3" />
                  </Badge>
                ) : (
                  <Badge key={m.id} variant="outline" className="text-muted-foreground">
                    <X className="w-3 h-3" />
                  </Badge>
                )
              ))}
            />
            <ComparisonRow
              label="Model ID"
              values={models.map((m) => (
                <code key={m.id} className="text-xs bg-muted px-1.5 py-0.5 rounded break-all">
                  {m.id}
                </code>
              ))}
              highlight
            />
            {/* Select Actions */}
            <tr>
              <td className="py-4 px-4 border-r border-border" />
              {models.map((model) => (
                <td key={model.id} className="py-4 px-4 border-r border-border last:border-r-0">
                  <Button
                    onClick={() => onSelect(model.id)}
                    className="w-full bg-apptax-blue hover:bg-apptax-blue/90"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Select
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

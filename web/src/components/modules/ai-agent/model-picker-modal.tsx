import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  X,
  GitCompare,
  Star,
  Clock,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { OpenRouterModelDto } from '@/types/dtos';
import { cn } from '@/lib/utils/cn';
import { useModelPreferences } from '@/lib/hooks/use-model-preferences';
import { ModelDetailPanel } from './model-detail-panel';
import { ModelComparisonView } from './model-comparison-view';
import { ModelFavoritesChip } from './model-favorites-chip';

interface ModelPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  models: OpenRouterModelDto[];
  isLoading?: boolean;
  selectedModelId?: string;
  onSelect: (modelId: string) => void;
}

type CostFilter = 'all' | 'free' | 'low' | 'medium' | 'high';
type ContextFilter = 'all' | '8k' | '32k' | '128k' | '200k+';
type ViewMode = 'browse' | 'compare';

const COST_TIERS: Record<CostFilter, string> = {
  all: 'All Prices',
  free: 'Free',
  low: '< $0.5/1K',
  medium: '$0.5-5/1K',
  high: '> $5/1K',
};

const CONTEXT_TIERS: Record<ContextFilter, string> = {
  all: 'All Sizes',
  '8k': '≤ 8K',
  '32k': '≤ 32K',
  '128k': '≤ 128K',
  '200k+': '> 128K',
};

function matchesCostFilter(model: OpenRouterModelDto, filter: CostFilter): boolean {
  if (filter === 'all') return true;
  const cost = model.costPer1kInput;
  switch (filter) {
    case 'free':
      return cost === 0;
    case 'low':
      return cost > 0 && cost < 0.5;
    case 'medium':
      return cost >= 0.5 && cost <= 5;
    case 'high':
      return cost > 5;
    default:
      return true;
  }
}

function matchesContextFilter(model: OpenRouterModelDto, filter: ContextFilter): boolean {
  if (filter === 'all') return true;
  const ctx = model.contextWindow;
  switch (filter) {
    case '8k':
      return ctx <= 8192;
    case '32k':
      return ctx <= 32768;
    case '128k':
      return ctx <= 131072;
    case '200k+':
      return ctx > 131072;
    default:
      return true;
  }
}

// Provider display order
const PROVIDER_ORDER = [
  'Anthropic',
  'OpenAI',
  'Google',
  'Meta',
  'Mistral',
  'Cohere',
  'DeepSeek',
];

function getProviderOrder(provider: string): number {
  const index = PROVIDER_ORDER.indexOf(provider);
  return index === -1 ? PROVIDER_ORDER.length : index;
}

export function ModelPickerModal({
  open,
  onOpenChange,
  models,
  isLoading = false,
  selectedModelId,
  onSelect,
}: ModelPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [costFilter, setCostFilter] = useState<CostFilter>('all');
  const [contextFilter, setContextFilter] = useState<ContextFilter>('all');
  const [selectedModel, setSelectedModel] = useState<OpenRouterModelDto | null>(null);
  const [comparisonModels, setComparisonModels] = useState<OpenRouterModelDto[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('browse');
  const [showFavoritesBar, setShowFavoritesBar] = useState(true);

  const {
    favorites,
    recents,
    toggleFavorite,
    isFavorite,
    addRecent,
  } = useModelPreferences();

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setCostFilter('all');
      setContextFilter('all');
      setViewMode('browse');
      setComparisonModels([]);
      // Select the currently saved model if it exists
      if (selectedModelId) {
        const model = models.find((m) => m.id === selectedModelId);
        setSelectedModel(model || null);
      } else {
        setSelectedModel(null);
      }
    }
  }, [open, selectedModelId, models]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Ctrl+K: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('model-search')?.focus();
      }
      // Ctrl+F: Toggle favorites bar
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowFavoritesBar((prev) => !prev);
      }
      // Ctrl+C: Toggle comparison view
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.shiftKey) {
        e.preventDefault();
        if (comparisonModels.length > 0) {
          setViewMode((prev) => (prev === 'compare' ? 'browse' : 'compare'));
        }
      }
      // Escape: Close comparison view or modal
      if (e.key === 'Escape') {
        if (viewMode === 'compare') {
          e.preventDefault();
          setViewMode('browse');
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, viewMode, comparisonModels.length]);

  // Filter and group models
  const { groupedModels, totalCount, filteredCount } = useMemo(() => {
    const filtered = models.filter((model) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          model.name.toLowerCase().includes(query) ||
          model.id.toLowerCase().includes(query) ||
          model.provider.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Cost filter
      if (!matchesCostFilter(model, costFilter)) return false;

      // Context filter
      if (!matchesContextFilter(model, contextFilter)) return false;

      return true;
    });

    // Group by provider
    const grouped = filtered.reduce((acc, model) => {
      const provider = model.provider || 'Other';
      if (!acc[provider]) {
        acc[provider] = [];
      }
      acc[provider].push(model);
      return acc;
    }, {} as Record<string, OpenRouterModelDto[]>);

    // Sort providers by priority
    const sortedProviders = Object.keys(grouped).sort(
      (a, b) => getProviderOrder(a) - getProviderOrder(b)
    );

    const sortedGrouped: Record<string, OpenRouterModelDto[]> = {};
    for (const provider of sortedProviders) {
      // Sort models within each provider by popularity/name
      sortedGrouped[provider] = grouped[provider].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    }

    return {
      groupedModels: sortedGrouped,
      totalCount: models.length,
      filteredCount: filtered.length,
    };
  }, [models, searchQuery, costFilter, contextFilter]);

  // Get favorite and recent models
  const favoriteModels = useMemo(() => {
    return favorites
      .map((id) => models.find((m) => m.id === id))
      .filter((m): m is OpenRouterModelDto => m !== undefined)
      .slice(0, 5);
  }, [favorites, models]);

  const recentModels = useMemo(() => {
    return recents
      .map((id) => models.find((m) => m.id === id))
      .filter((m): m is OpenRouterModelDto => m !== undefined)
      .filter((m) => !favorites.includes(m.id)) // Don't show if already in favorites
      .slice(0, 3);
  }, [recents, models, favorites]);

  const handleModelClick = useCallback((model: OpenRouterModelDto) => {
    setSelectedModel(model);
  }, []);

  const handleSelectModel = useCallback(() => {
    if (selectedModel) {
      addRecent(selectedModel.id);
      onSelect(selectedModel.id);
      onOpenChange(false);
    }
  }, [selectedModel, addRecent, onSelect, onOpenChange]);

  const handleSelectFromComparison = useCallback(
    (modelId: string) => {
      addRecent(modelId);
      onSelect(modelId);
      onOpenChange(false);
    },
    [addRecent, onSelect, onOpenChange]
  );

  const handleToggleComparison = useCallback(
    (model: OpenRouterModelDto) => {
      setComparisonModels((prev) => {
        const isInComparison = prev.some((m) => m.id === model.id);
        if (isInComparison) {
          return prev.filter((m) => m.id !== model.id);
        }
        if (prev.length >= 3) {
          return prev; // Max 3 models
        }
        return [...prev, model];
      });
    },
    []
  );

  const handleRemoveFromComparison = useCallback((modelId: string) => {
    setComparisonModels((prev) => prev.filter((m) => m.id !== modelId));
  }, []);

  const isInComparison = useCallback(
    (modelId: string) => comparisonModels.some((m) => m.id === modelId),
    [comparisonModels]
  );

  const handleToggleFavorite = useCallback(() => {
    if (selectedModel) {
      toggleFavorite(selectedModel.id);
    }
  }, [selectedModel, toggleFavorite]);

  const handleAddToCompare = useCallback(() => {
    if (selectedModel) {
      handleToggleComparison(selectedModel);
    }
  }, [selectedModel, handleToggleComparison]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[80vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Select AI Model
            </DialogTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">⌘K</kbd>
              <span>Search</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">⌘F</kbd>
              <span>Favorites</span>
              {comparisonModels.length > 0 && (
                <>
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">⌘C</kbd>
                  <span>Compare</span>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Favorites & Recents Bar */}
        {showFavoritesBar && (favoriteModels.length > 0 || recentModels.length > 0) && (
          <div className="px-6 py-3 border-b border-border bg-muted/30 flex-shrink-0">
            <div className="flex items-center gap-4 flex-wrap">
              {favoriteModels.length > 0 && (
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {favoriteModels.map((model) => (
                      <ModelFavoritesChip
                        key={model.id}
                        modelId={model.id}
                        modelName={model.name}
                        isSelected={selectedModel?.id === model.id}
                        onClick={() => handleModelClick(model)}
                        onRemove={() => toggleFavorite(model.id)}
                        type="favorite"
                      />
                    ))}
                  </div>
                </div>
              )}
              {recentModels.length > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {recentModels.map((model) => (
                      <ModelFavoritesChip
                        key={model.id}
                        modelId={model.id}
                        modelName={model.name}
                        isSelected={selectedModel?.id === model.id}
                        onClick={() => handleModelClick(model)}
                        type="recent"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        {viewMode === 'compare' ? (
          <ModelComparisonView
            models={comparisonModels}
            onSelect={handleSelectFromComparison}
            onRemove={handleRemoveFromComparison}
            onBack={() => setViewMode('browse')}
          />
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Panel - Search & List */}
            <div className="w-3/5 flex flex-col border-r border-border">
              {/* Search & Filters */}
              <div className="px-4 py-3 border-b border-border space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="model-search"
                    placeholder="Search models..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-9"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted"
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={costFilter}
                    onValueChange={(v) => setCostFilter(v as CostFilter)}
                  >
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue placeholder="Cost" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(COST_TIERS).map(([key, label]) => (
                        <SelectItem key={key} value={key} className="text-xs">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={contextFilter}
                    onValueChange={(v) => setContextFilter(v as ContextFilter)}
                  >
                    <SelectTrigger className="w-[120px] h-8 text-xs">
                      <SelectValue placeholder="Context" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONTEXT_TIERS).map(([key, label]) => (
                        <SelectItem key={key} value={key} className="text-xs">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {filteredCount} of {totalCount} models
                  </span>
                </div>
              </div>

              {/* Model List */}
              <ScrollArea className="flex-1">
                {isLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : Object.keys(groupedModels).length === 0 ? (
                  <div className="flex items-center justify-center h-40">
                    <p className="text-sm text-muted-foreground">
                      No models found matching your criteria
                    </p>
                  </div>
                ) : (
                  <div className="py-2">
                    {Object.entries(groupedModels).map(([provider, providerModels]) => (
                      <div key={provider} className="mb-2">
                        <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/50 sticky top-0 z-10">
                          {provider} ({providerModels.length})
                        </div>
                        {providerModels.map((model) => (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => handleModelClick(model)}
                            className={cn(
                              'w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-accent/50 transition-colors',
                              selectedModel?.id === model.id && 'bg-accent'
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">
                                  {model.name}
                                </span>
                                {isFavorite(model.id) && (
                                  <Star className="w-3 h-3 text-yellow-500 fill-current flex-shrink-0" />
                                )}
                                {isInComparison(model.id) && (
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                    Compare
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                <span>
                                  {model.costPer1kInput === 0
                                    ? 'Free'
                                    : `$${model.costPer1kInput.toFixed(4)}/1K`}
                                </span>
                                <span>•</span>
                                <span>
                                  {model.contextWindow >= 1000
                                    ? `${(model.contextWindow / 1000).toFixed(0)}K`
                                    : model.contextWindow}{' '}
                                  ctx
                                </span>
                                {model.supportsVision && (
                                  <>
                                    <span>•</span>
                                    <span>Vision</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Right Panel - Detail View */}
            <ModelDetailPanel
              model={selectedModel}
              onSelect={handleSelectModel}
              onAddToCompare={handleAddToCompare}
              onToggleFavorite={handleToggleFavorite}
              isFavorite={selectedModel ? isFavorite(selectedModel.id) : false}
              isInComparison={selectedModel ? isInComparison(selectedModel.id) : false}
              comparisonFull={comparisonModels.length >= 3}
            />
          </div>
        )}

        {/* Footer */}
        {viewMode === 'browse' && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/30 flex-shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {filteredCount} models available
              </span>
              {comparisonModels.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode('compare')}
                  className="gap-2"
                >
                  <GitCompare className="w-4 h-4" />
                  Compare ({comparisonModels.length})
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSelectModel}
                disabled={!selectedModel}
                className="bg-apptax-blue hover:bg-apptax-blue/90"
              >
                Select Model
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

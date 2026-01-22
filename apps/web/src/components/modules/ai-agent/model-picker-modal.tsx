import { useState, useMemo, useCallback, useEffect, memo } from 'react';

import { Search, X, GitCompare, Star, Clock, Loader2, ChevronRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useModelPreferences } from '@/lib/hooks/use-model-preferences';
import { cn } from '@/lib/utils/cn';
import { type OpenRouterModelDto } from '@/types/dtos';

import { ModelComparisonView } from './model-comparison-view';
import { ModelDetailPanel } from './model-detail-panel';
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
  all: 'Wszystkie ceny',
  free: 'Darmowe',
  low: '< $0.5/1K',
  medium: '$0.5-5/1K',
  high: '> $5/1K',
};

const CONTEXT_TIERS: Record<ContextFilter, string> = {
  all: 'Wszystkie rozmiary',
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
const PROVIDER_ORDER = ['Anthropic', 'OpenAI', 'Google', 'Meta', 'Mistral', 'Cohere', 'DeepSeek'];

function getProviderOrder(provider: string): number {
  const index = PROVIDER_ORDER.indexOf(provider);
  return index === -1 ? PROVIDER_ORDER.length : index;
}

// Inner content component - remounts when dialog opens to reset state
interface ModelPickerModalContentProps {
  onOpenChange: (open: boolean) => void;
  models: OpenRouterModelDto[];
  isLoading: boolean;
  selectedModelId?: string;
  onSelect: (modelId: string) => void;
}

const ModelPickerModalContent = memo(function ModelPickerModalContent({
  onOpenChange,
  models,
  isLoading,
  selectedModelId,
  onSelect,
}: ModelPickerModalContentProps) {
  // State initializes fresh on each mount (when dialog opens)
  const [searchQuery, setSearchQuery] = useState('');
  const [costFilter, setCostFilter] = useState<CostFilter>('all');
  const [contextFilter, setContextFilter] = useState<ContextFilter>('all');
  // Initialize selectedModel from prop
  const [selectedModel, setSelectedModel] = useState<OpenRouterModelDto | null>(() => {
    if (selectedModelId) {
      return models.find((m) => m.id === selectedModelId) || null;
    }
    return null;
  });
  const [comparisonModels, setComparisonModels] = useState<OpenRouterModelDto[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('browse');
  const [showFavoritesBar, setShowFavoritesBar] = useState(true);

  const { favorites, recents, toggleFavorite, isFavorite, addRecent } = useModelPreferences();

  // Keyboard shortcuts - component only renders when open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ctrl+K: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('model-search')?.focus();
      }
      // Ctrl+Shift+F: Toggle favorites bar (avoid conflict with browser find)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        setShowFavoritesBar((prev) => !prev);
      }
      // Ctrl+Shift+C: Toggle comparison view (avoid conflict with browser copy)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'c') {
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
  }, [viewMode, comparisonModels.length]);

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
    const grouped = filtered.reduce(
      (acc, model) => {
        const provider = model.provider || 'Other';
        if (!acc[provider]) {
          acc[provider] = [];
        }
        acc[provider].push(model);
        return acc;
      },
      {} as Record<string, OpenRouterModelDto[]>
    );

    // Sort providers by priority
    const sortedProviders = Object.keys(grouped).sort(
      (a, b) => getProviderOrder(a) - getProviderOrder(b)
    );

    const sortedGrouped: Record<string, OpenRouterModelDto[]> = {};
    for (const provider of sortedProviders) {
      // Sort models within each provider by popularity/name
      sortedGrouped[provider] = grouped[provider].sort((a, b) => a.name.localeCompare(b.name));
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

  const handleToggleComparison = useCallback((model: OpenRouterModelDto) => {
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
  }, []);

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
    <>
      <DialogContent className="flex h-[80vh] max-w-5xl flex-col p-0">
        <DialogHeader className="border-border flex-shrink-0 border-b px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">Wybierz model AI</DialogTitle>
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <kbd className="bg-muted rounded px-1.5 py-0.5 text-[10px]">⌘K</kbd>
              <span>Szukaj</span>
              <kbd className="bg-muted rounded px-1.5 py-0.5 text-[10px]">⌘⇧F</kbd>
              <span>Ulubione</span>
              {comparisonModels.length > 0 && (
                <>
                  <kbd className="bg-muted rounded px-1.5 py-0.5 text-[10px]">⌘⇧C</kbd>
                  <span>Porównaj</span>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Favorites & Recents Bar */}
        {showFavoritesBar && (favoriteModels.length > 0 || recentModels.length > 0) && (
          <div className="border-border bg-muted/30 flex-shrink-0 border-b px-6 py-3">
            <div className="flex flex-wrap items-center gap-4">
              {favoriteModels.length > 0 && (
                <div className="flex items-center gap-2">
                  <Star className="h-3.5 w-3.5 fill-current text-yellow-500" />
                  <div className="flex flex-wrap items-center gap-1.5">
                    {favoriteModels.map((model) => (
                      <ModelFavoritesChip
                        key={model.id}
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
                  <Clock className="text-muted-foreground h-3.5 w-3.5" />
                  <div className="flex flex-wrap items-center gap-1.5">
                    {recentModels.map((model) => (
                      <ModelFavoritesChip
                        key={model.id}
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
          <div className="flex flex-1 overflow-hidden">
            {/* Left Panel - Search & List */}
            <div className="border-border flex w-3/5 flex-col border-r">
              {/* Search & Filters */}
              <div className="border-border space-y-3 border-b px-4 py-3">
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <Input
                    id="model-search"
                    placeholder="Szukaj modeli..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-9 pl-9"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="hover:bg-muted absolute top-1/2 right-3 -translate-y-1/2 rounded p-0.5"
                    >
                      <X className="text-muted-foreground h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Select value={costFilter} onValueChange={(v) => setCostFilter(v as CostFilter)}>
                    <SelectTrigger className="h-8 w-[130px] text-xs">
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
                    <SelectTrigger className="h-8 w-[120px] text-xs">
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
                  <span className="text-muted-foreground ml-auto text-xs">
                    {filteredCount} z {totalCount} modeli
                  </span>
                </div>
              </div>

              {/* Model List */}
              <ScrollArea className="flex-1">
                {isLoading ? (
                  <div className="flex h-40 items-center justify-center">
                    <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                  </div>
                ) : Object.keys(groupedModels).length === 0 ? (
                  <div className="flex h-40 items-center justify-center">
                    <p className="text-muted-foreground text-sm">
                      Nie znaleziono modeli spełniających kryteria
                    </p>
                  </div>
                ) : (
                  <div className="py-2">
                    {Object.entries(groupedModels).map(([provider, providerModels]) => (
                      <div key={provider} className="mb-2">
                        <div className="text-muted-foreground bg-muted/50 sticky top-0 z-10 px-4 py-1.5 text-xs font-medium tracking-wider uppercase">
                          {provider} ({providerModels.length})
                        </div>
                        {providerModels.map((model) => (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => handleModelClick(model)}
                            className={cn(
                              'hover:bg-accent/50 flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                              selectedModel?.id === model.id && 'bg-accent'
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-medium">{model.name}</span>
                                {isFavorite(model.id) && (
                                  <Star className="h-3 w-3 flex-shrink-0 fill-current text-yellow-500" />
                                )}
                                {isInComparison(model.id) && (
                                  <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                                    Compare
                                  </Badge>
                                )}
                              </div>
                              <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
                                <span>
                                  {model.costPer1kInput === 0
                                    ? 'Darmowy'
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
                                    <span>Wizja</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="text-muted-foreground h-4 w-4 flex-shrink-0" />
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
          <div className="border-border bg-muted/30 flex flex-shrink-0 items-center justify-between border-t px-6 py-4">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground text-sm">
                {filteredCount} dostępnych modeli
              </span>
              {comparisonModels.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode('compare')}
                  className="gap-2"
                >
                  <GitCompare className="h-4 w-4" />
                  Porównaj ({comparisonModels.length})
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Anuluj
              </Button>
              <Button
                onClick={handleSelectModel}
                disabled={!selectedModel}
                className="bg-apptax-blue hover:bg-apptax-blue/90"
              >
                Wybierz model
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </>
  );
});

// Main exported component - wraps Dialog and conditionally renders content
export function ModelPickerModal({
  open,
  onOpenChange,
  models,
  isLoading = false,
  selectedModelId,
  onSelect,
}: ModelPickerModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <ModelPickerModalContent
          onOpenChange={onOpenChange}
          models={models}
          isLoading={isLoading}
          selectedModelId={selectedModelId}
          onSelect={onSelect}
        />
      )}
    </Dialog>
  );
}

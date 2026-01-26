import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { ModelPickerModal } from '@/components/modules/ai-agent/model-picker-modal';
import {
  type AIConfigurationResponseDto,
  type AIProvider,
  type OpenAIModelDto,
  type OpenRouterModelDto,
} from '@/types/dtos';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  Database,
  ExternalLink,
  Eye,
  KeyRound,
  Radio,
  Settings,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useAIConfiguration,
  useCreateAIConfiguration,
  useOpenAIEmbeddingModels,
  useOpenAIModels,
  useOpenRouterModels,
  useResetApiKey,
  useUpdateAIConfiguration,
} from '@/lib/hooks/use-ai-agent';
import {
  updateAIConfigurationSchema,
  type UpdateAIConfigurationFormData,
} from '@/lib/validation/schemas';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

// Fallback models used while loading or if API fails
const FALLBACK_OPENAI_MODELS: OpenAIModelDto[] = [
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable model, multimodal' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and affordable' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'High capability with vision' },
  { id: 'gpt-4', name: 'GPT-4', description: 'Original GPT-4' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and cost-effective' },
  { id: 'o1-preview', name: 'o1 Preview', description: 'Advanced reasoning' },
  { id: 'o1-mini', name: 'o1 Mini', description: 'Efficient reasoning' },
];

// Fallback embedding models
const FALLBACK_EMBEDDING_MODELS: OpenAIModelDto[] = [
  {
    id: 'text-embedding-3-small',
    name: 'text-embedding-3-small',
    description: 'Newest, cheapest, 1536 dims',
  },
  {
    id: 'text-embedding-3-large',
    name: 'text-embedding-3-large',
    description: 'Best quality, 3072 dims',
  },
  {
    id: 'text-embedding-ada-002',
    name: 'text-embedding-ada-002',
    description: 'Legacy model, 1536 dims',
  },
];

function formatContextWindow(tokens: number): string {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`;
  return `${tokens}`;
}

function formatCost(costPer1k: number): string {
  if (costPer1k === 0) return 'Free';
  if (costPer1k < 0.01) return `$${(costPer1k * 1000).toFixed(4)}/1M`;
  if (costPer1k < 1) return `$${costPer1k.toFixed(4)}/1K`;
  return `$${costPer1k.toFixed(2)}/1K`;
}

// Separate form component that receives config as prop
// This ensures useForm is called with correct defaultValues from the start
interface ConfigurationFormProps {
  config: AIConfigurationResponseDto | null;
  openRouterModels: OpenRouterModelDto[];
  isLoadingModels: boolean;
  openAIModels: OpenAIModelDto[];
  isLoadingOpenAIModels: boolean;
  openAIEmbeddingModels: OpenAIModelDto[];
  isLoadingEmbeddingModels: boolean;
  onSubmit: (data: UpdateAIConfigurationFormData) => Promise<void>;
  isPending: boolean;
  onResetApiKey: () => void;
  isResettingApiKey: boolean;
}

function ConfigurationForm({
  config,
  openRouterModels,
  isLoadingModels,
  openAIModels,
  isLoadingOpenAIModels,
  openAIEmbeddingModels,
  isLoadingEmbeddingModels,
  onSubmit,
  isPending,
  onResetApiKey,
  isResettingApiKey,
}: ConfigurationFormProps) {
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  const form = useForm<UpdateAIConfigurationFormData>({
    resolver: zodResolver(updateAIConfigurationSchema),
    defaultValues: {
      provider: config?.provider || 'openai',
      model: config?.model || 'gpt-4o',
      systemPrompt: config?.systemPrompt || '',
      temperature: config?.temperature ?? 0.7,
      maxTokens: config?.maxTokens ?? 4000,
      enableStreaming: config?.enableStreaming ?? false,
      apiKey: '',
      // Embedding configuration
      embeddingProvider: config?.embeddingProvider || 'openai',
      embeddingModel: config?.embeddingModel || 'text-embedding-ada-002',
      embeddingApiKey: '',
    },
  });

  // Watch provider to conditionally render model selection
  const selectedProvider = useWatch({
    control: form.control,
    name: 'provider',
  });

  const selectedModelId = useWatch({
    control: form.control,
    name: 'model',
  });

  // Find the selected OpenRouter model for display
  const selectedOpenRouterModel = useMemo<OpenRouterModelDto | undefined>(() => {
    if (selectedProvider !== 'openrouter' || !selectedModelId) return undefined;
    return openRouterModels.find((m) => m.id === selectedModelId);
  }, [selectedProvider, selectedModelId, openRouterModels]);

  const handleModelSelect = (modelId: string) => {
    form.setValue('model', modelId, { shouldValidate: true, shouldDirty: true });
  };

  const handleResetApiKey = () => {
    onResetApiKey();
    setShowResetDialog(false);
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Provider */}
          <FormField
            control={form.control}
            name="provider"
            render={({ field }) => (
              <FormItem>
                <FormLabel>AI Provider</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    // Reset model when switching providers
                    if (value === 'openai') {
                      form.setValue('model', 'gpt-4o');
                    } else if (value === 'openrouter') {
                      // Keep current model if it's a valid OpenRouter model, otherwise clear
                      const currentModel = form.getValues('model');
                      const isValidOpenRouterModel = openRouterModels.some(
                        (m) => m.id === currentModel
                      );
                      if (!isValidOpenRouterModel) {
                        form.setValue('model', '');
                      }
                    }
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Choose between OpenAI (direct) or OpenRouter (multiple models)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Model Selection - Conditional based on provider */}
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model</FormLabel>
                {selectedProvider === 'openai' ? (
                  // OpenAI: Select with predefined list
                  <>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingOpenAIModels ? (
                          <SelectItem value="loading" disabled>
                            Loading models...
                          </SelectItem>
                        ) : (
                          openAIModels.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              <div className="flex items-center gap-2">
                                <span>{model.name}</span>
                                <span className="text-muted-foreground text-xs">
                                  ({model.description})
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>Select an OpenAI model for your AI assistant</FormDescription>
                  </>
                ) : (
                  // OpenRouter: Model picker
                  <>
                    {selectedOpenRouterModel ? (
                      <div className="border-border bg-muted/30 space-y-3 rounded-lg border p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h4 className="text-foreground truncate font-semibold">
                              {selectedOpenRouterModel.name}
                            </h4>
                            <p className="text-muted-foreground text-sm">
                              {selectedOpenRouterModel.provider}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowModelPicker(true)}
                          >
                            Change
                          </Button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {formatCost(selectedOpenRouterModel.costPer1kInput)} input
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {formatContextWindow(selectedOpenRouterModel.contextWindow)} context
                          </Badge>
                          {selectedOpenRouterModel.supportsVision && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <Eye className="h-3 w-3" />
                              Vision
                            </Badge>
                          )}
                          {selectedOpenRouterModel.supportsFunctionCalling && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <Wrench className="h-3 w-3" />
                              Tools
                            </Badge>
                          )}
                        </div>
                        <code className="text-muted-foreground bg-muted block rounded px-2 py-1 text-xs break-all">
                          {selectedOpenRouterModel.id}
                        </code>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowModelPicker(true)}
                        className="h-auto w-full justify-start py-4"
                        disabled={isLoadingModels}
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-accent/10 flex h-10 w-10 items-center justify-center rounded-lg">
                            <Zap className="text-primary h-5 w-5" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium">
                              {isLoadingModels ? 'Loading models...' : 'Select Model'}
                            </p>
                            <p className="text-muted-foreground text-sm">
                              {isLoadingModels
                                ? 'Please wait...'
                                : `Browse ${openRouterModels.length} available models`}
                            </p>
                          </div>
                        </div>
                      </Button>
                    )}
                    <FormDescription>
                      Choose from hundreds of AI models via OpenRouter
                    </FormDescription>
                    {/* Hidden input to store the value */}
                    <Input type="hidden" {...field} />
                  </>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* API Key */}
          <FormField
            control={form.control}
            name="apiKey"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>API Key</FormLabel>
                  {config?.hasApiKey && (
                    <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={isResettingApiKey}
                        >
                          <KeyRound className="mr-1 h-3 w-3" />
                          Reset Key
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reset API Key?</DialogTitle>
                          <DialogDescription>
                            This will clear the current API key. AI features will be disabled until
                            you configure a new API key.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowResetDialog(false)}>
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleResetApiKey}
                            disabled={isResettingApiKey}
                          >
                            {isResettingApiKey ? 'Resetting...' : 'Reset API Key'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    placeholder={config?.hasApiKey ? '●●●●●●●● (configured)' : 'Enter API key'}
                  />
                </FormControl>
                <FormDescription>
                  {config?.hasApiKey
                    ? 'Leave empty to keep current key. Only update if changing providers or rotating keys.'
                    : `Enter your ${selectedProvider === 'openrouter' ? 'OpenRouter' : 'OpenAI'} API key.`}
                  {selectedProvider === 'openrouter' && (
                    <a
                      href="https://openrouter.ai/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary ml-1 inline-flex items-center gap-1 hover:underline"
                    >
                      Get API key
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </FormDescription>
                {config?.hasApiKey && (
                  <p className="flex items-center gap-1 text-sm text-green-600">
                    <span>✓</span> API Key is configured (hidden for security)
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* System Prompt */}
          <FormField
            control={form.control}
            name="systemPrompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>System Prompt</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="You are a helpful AI assistant for accounting..."
                    rows={6}
                  />
                </FormControl>
                <FormDescription>
                  Instructions that define AI behavior and personality
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            {/* Temperature */}
            <FormField
              control={form.control}
              name="temperature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temperature</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>0 = Focused, 2 = Creative</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Max Tokens */}
            <FormField
              control={form.control}
              name="maxTokens"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Tokens</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="100"
                      min="100"
                      max="128000"
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Response length limit</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Streaming Mode */}
          <FormField
            control={form.control}
            name="enableStreaming"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="flex items-center gap-2 text-base">
                    <Radio className="text-accent h-4 w-4" />
                    Streaming Mode
                  </FormLabel>
                  <FormDescription>
                    Enable real-time response streaming. AI responses will appear word-by-word
                    instead of all at once.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Embedding Configuration Section */}
          <div className="bg-muted/30 space-y-4 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Database className="text-accent h-5 w-5" />
              <h3 className="text-base font-semibold">Embedding Configuration</h3>
              <span className="text-muted-foreground text-xs">(for Knowledge Base)</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Configure a separate API key and model for generating embeddings. Used when uploading
              documents to the Knowledge Base.
            </p>

            {/* Warning about OpenRouter */}
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                OpenRouter does not support embeddings. If your main provider is OpenRouter, you
                must configure a separate OpenAI API key for embeddings to use the Knowledge Base
                feature.
              </p>
            </div>

            {/* Embedding Provider */}
            <FormField
              control={form.control}
              name="embeddingProvider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Embedding Provider</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select embedding provider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI (Recommended)</SelectItem>
                      <SelectItem value="openrouter" disabled>
                        OpenRouter (Not Supported)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>Only OpenAI supports embedding generation</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Embedding Model */}
            <FormField
              control={form.control}
              name="embeddingModel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Embedding Model</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select embedding model" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingEmbeddingModels ? (
                        <SelectItem value="loading" disabled>
                          Loading models...
                        </SelectItem>
                      ) : (
                        openAIEmbeddingModels.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex items-center gap-2">
                              <span>{model.name}</span>
                              <span className="text-muted-foreground text-xs">
                                ({model.description})
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>Model used for generating document embeddings</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Embedding API Key */}
            <FormField
              control={form.control}
              name="embeddingApiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Embedding API Key (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder={
                        config?.hasEmbeddingApiKey
                          ? '●●●●●●●● (configured)'
                          : 'Enter separate API key (optional)'
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    {config?.hasEmbeddingApiKey
                      ? 'Leave empty to keep current key. Clear this to use the main API key.'
                      : 'Optional: Use a separate OpenAI API key for embeddings. If not provided, the main API key will be used.'}
                  </FormDescription>
                  {config?.hasEmbeddingApiKey && (
                    <p className="flex items-center gap-1 text-sm text-green-600">
                      <span>✓</span> Separate embedding API Key configured
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md w-full transition-all"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {isPending ? 'Saving...' : 'Save Configuration'}
          </Button>
        </form>
      </Form>

      {/* Model Picker Modal */}
      <ModelPickerModal
        open={showModelPicker}
        onOpenChange={setShowModelPicker}
        models={openRouterModels}
        isLoading={isLoadingModels}
        selectedModelId={selectedModelId}
        onSelect={handleModelSelect}
      />
    </>
  );
}

export default function AdminConfigurationPage() {
  const { data: config, isLoading } = useAIConfiguration();
  const createConfig = useCreateAIConfiguration();
  const updateConfig = useUpdateAIConfiguration();
  const resetApiKey = useResetApiKey();
  const { data: openRouterModels = [], isLoading: isLoadingModels } = useOpenRouterModels();
  const { data: openAIModels = FALLBACK_OPENAI_MODELS, isLoading: isLoadingOpenAIModels } =
    useOpenAIModels();
  const {
    data: openAIEmbeddingModels = FALLBACK_EMBEDDING_MODELS,
    isLoading: isLoadingEmbeddingModels,
  } = useOpenAIEmbeddingModels();

  const handleSubmit = async (data: UpdateAIConfigurationFormData) => {
    // Remove apiKey from data if it's empty (don't update key)
    const submitData = { ...data };
    if (!submitData.apiKey || submitData.apiKey.trim() === '') {
      delete submitData.apiKey;
    }
    // Send empty string to clear embeddingApiKey, or omit if unchanged
    if (!submitData.embeddingApiKey || submitData.embeddingApiKey.trim() === '') {
      submitData.embeddingApiKey = '';
    }

    if (config) {
      // Update existing configuration - cast to proper types
      await updateConfig.mutateAsync({
        ...submitData,
        provider: submitData.provider as AIProvider | undefined,
        embeddingProvider: submitData.embeddingProvider as AIProvider | undefined,
      });
    } else {
      // Create new configuration - API key is required
      if (!data.apiKey || data.apiKey.trim() === '') {
        toast.error('API Key is required when creating initial configuration');
        return;
      }
      await createConfig.mutateAsync({
        provider: (data.provider || 'openai') as AIProvider,
        model: data.model || 'gpt-4o',
        apiKey: data.apiKey,
        systemPrompt: data.systemPrompt,
        temperature: data.temperature,
        maxTokens: data.maxTokens,
        enableStreaming: data.enableStreaming,
        // Embedding configuration
        embeddingProvider: data.embeddingProvider as AIProvider | undefined,
        embeddingModel: data.embeddingModel,
        embeddingApiKey: data.embeddingApiKey || undefined,
      });
    }
  };

  // Show loading state while fetching config
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-foreground flex items-center gap-3">
          <div className="bg-accent ai-glow h-3 w-3 animate-pulse rounded-full" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-8 p-8">
      <div>
        <h1 className="text-foreground flex items-center gap-3 text-3xl font-bold">
          AI Configuration
          <div className="bg-accent ai-glow h-3 w-3 rounded-full" />
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure AI provider, model, and system behavior
        </p>
      </div>

      <Card className="border-accent/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="bg-accent/10 flex h-10 w-10 items-center justify-center rounded-lg">
              <Settings className="text-primary h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-foreground">AI Settings</CardTitle>
              <CardDescription>
                Configure the AI provider and model settings for all conversations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Key forces form re-mount when config changes, ensuring Select components get correct defaultValues */}
          <ConfigurationForm
            key={config?.id ?? 'new'}
            config={config ?? null}
            openRouterModels={openRouterModels}
            isLoadingModels={isLoadingModels}
            openAIModels={openAIModels}
            isLoadingOpenAIModels={isLoadingOpenAIModels}
            openAIEmbeddingModels={openAIEmbeddingModels}
            isLoadingEmbeddingModels={isLoadingEmbeddingModels}
            onSubmit={handleSubmit}
            isPending={updateConfig.isPending || createConfig.isPending}
            onResetApiKey={() => resetApiKey.mutate()}
            isResettingApiKey={resetApiKey.isPending}
          />
        </CardContent>
      </Card>

      {config && (
        <Card>
          <CardHeader>
            <CardTitle>Current Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Chat Configuration */}
            <div>
              <h4 className="text-muted-foreground mb-2 text-sm font-semibold">Chat Settings</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Provider:</span> {config.provider}
                </div>
                <div>
                  <span className="font-medium">Model:</span> {config.model}
                </div>
                <div>
                  <span className="font-medium">Temperature:</span> {config.temperature}
                </div>
                <div>
                  <span className="font-medium">Max Tokens:</span> {config.maxTokens}
                </div>
                <div>
                  <span className="font-medium">Streaming:</span>{' '}
                  {config.enableStreaming ? (
                    <span className="text-green-600">✓ Enabled</span>
                  ) : (
                    <span className="text-muted-foreground">Disabled</span>
                  )}
                </div>
                <div>
                  <span className="font-medium">API Key:</span>{' '}
                  {config.hasApiKey ? (
                    <span className="text-green-600">✓ Configured</span>
                  ) : (
                    <span className="text-red-600">✗ Not configured</span>
                  )}
                </div>
              </div>
            </div>

            {/* Embedding Configuration */}
            <div className="border-t pt-4">
              <h4 className="text-muted-foreground mb-2 flex items-center gap-2 text-sm font-semibold">
                <Database className="h-4 w-4" />
                Embedding Settings (Knowledge Base)
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Provider:</span>{' '}
                  {config.embeddingProvider || 'openai'}
                </div>
                <div>
                  <span className="font-medium">Model:</span>{' '}
                  {config.embeddingModel || 'text-embedding-ada-002'}
                </div>
                <div className="col-span-2">
                  <span className="font-medium">API Key:</span>{' '}
                  {config.hasEmbeddingApiKey ? (
                    <span className="text-green-600">✓ Separate key configured</span>
                  ) : (
                    <span className="text-muted-foreground">Using main API key</span>
                  )}
                </div>
              </div>
            </div>

            {/* Meta Information */}
            <div className="text-muted-foreground border-t pt-4 text-sm">
              <span className="font-medium">Last Updated:</span>{' '}
              {new Date(config.updatedAt).toLocaleString()} by{' '}
              {config.updatedBy?.firstName || config.createdBy.firstName}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAIConfiguration, useCreateAIConfiguration, useUpdateAIConfiguration } from '@/lib/hooks/use-ai-agent';
import { updateAIConfigurationSchema, UpdateAIConfigurationFormData } from '@/lib/validation/schemas';
import { Settings, Sparkles } from 'lucide-react';

export default function AdminConfigurationPage() {
  const { data: config, isLoading } = useAIConfiguration();
  const createConfig = useCreateAIConfiguration();
  const updateConfig = useUpdateAIConfiguration();

  const form = useForm<UpdateAIConfigurationFormData>({
    resolver: zodResolver(updateAIConfigurationSchema),
    defaultValues: {
      provider: 'openai',
      model: 'gpt-4',
      systemPrompt: '',
      temperature: 0.7,
      maxTokens: 4000,
    },
  });

  // Populate form when config loads
  useEffect(() => {
    if (config) {
      form.reset({
        provider: config.provider,
        model: config.model,
        systemPrompt: config.systemPrompt || '',
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      });
    }
  }, [config, form]);

  const onSubmit = async (data: UpdateAIConfigurationFormData) => {
    // Remove apiKey from data if it's empty (don't update key)
    const submitData = { ...data };
    if (!submitData.apiKey || submitData.apiKey.trim() === '') {
      delete submitData.apiKey;
    }

    if (config) {
      // Update existing configuration
      await updateConfig.mutateAsync(submitData);
    } else {
      // Create new configuration - API key is required
      if (!data.apiKey || data.apiKey.trim() === '') {
        alert('API Key is required when creating initial configuration');
        return;
      }
      await createConfig.mutateAsync({
        provider: data.provider || 'openai',
        model: data.model || 'gpt-4',
        apiKey: data.apiKey,
        systemPrompt: data.systemPrompt,
        temperature: data.temperature,
        maxTokens: data.maxTokens,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-apptax-navy">
          <div className="w-3 h-3 rounded-full bg-apptax-teal ai-glow animate-pulse" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-apptax-navy flex items-center gap-3">
          AI Configuration
          <div className="w-3 h-3 rounded-full bg-apptax-teal ai-glow" />
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure AI provider, model, and system behavior
        </p>
      </div>

      <Card className="border-apptax-soft-teal/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-apptax-soft-teal rounded-lg flex items-center justify-center">
              <Settings className="h-5 w-5 text-apptax-blue" />
            </div>
            <div>
              <CardTitle className="text-apptax-navy">AI Settings</CardTitle>
              <CardDescription>
                Configure the AI provider and model settings for all conversations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Provider */}
              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AI Provider</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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

              {/* Model */}
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="gpt-4, gpt-3.5-turbo, etc." />
                    </FormControl>
                    <FormDescription>
                      Model identifier (e.g., gpt-4, gpt-3.5-turbo for OpenAI)
                    </FormDescription>
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
                    <FormLabel>API Key</FormLabel>
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
                        : 'Enter your API key for the selected provider.'}
                    </FormDescription>
                    {config?.hasApiKey && (
                      <p className="text-sm text-green-600 flex items-center gap-1">
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
                      <FormDescription>
                        0 = Focused, 2 = Creative
                      </FormDescription>
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
                      <FormDescription>
                        Response length limit
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                disabled={updateConfig.isPending || createConfig.isPending}
                className="w-full bg-apptax-blue hover:bg-apptax-blue/90 shadow-apptax-sm hover:shadow-apptax-md transition-all"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {updateConfig.isPending || createConfig.isPending ? 'Saving...' : 'Save Configuration'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {config && (
        <Card>
          <CardHeader>
            <CardTitle>Current Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
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
                <span className="font-medium">API Key:</span>{' '}
                {config.hasApiKey ? (
                  <span className="text-green-600">✓ Configured</span>
                ) : (
                  <span className="text-red-600">✗ Not configured</span>
                )}
              </div>
              <div className="col-span-2">
                <span className="font-medium">Last Updated:</span>{' '}
                {new Date(config.updatedAt).toLocaleString()} by {config.updatedBy?.firstName || config.createdBy.firstName}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

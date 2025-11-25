import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Settings, FolderOpen, BarChart3, ArrowRight } from 'lucide-react';

export default function AdminAIAgentDashboard() {
  const features = [
    {
      title: 'AI Chat',
      description: 'Start conversations with the AI assistant. Get intelligent responses based on your knowledge base.',
      icon: MessageSquare,
      href: '/admin/modules/ai-agent/chat',
      color: 'text-blue-500',
    },
    {
      title: 'AI Configuration',
      description: 'Configure AI provider (OpenAI/OpenRouter), model, API keys, and system prompt.',
      icon: Settings,
      href: '/admin/modules/ai-agent/configuration',
      color: 'text-purple-500',
    },
    {
      title: 'Knowledge Base Files',
      description: 'Upload and manage PDF, TXT, and MD files for RAG (Retrieval Augmented Generation).',
      icon: FolderOpen,
      href: '/admin/modules/ai-agent/context',
      color: 'text-green-500',
    },
    {
      title: 'Token Usage',
      description: 'View token consumption across all companies in the system.',
      icon: BarChart3,
      href: '/admin/modules/ai-agent/token-usage',
      color: 'text-orange-500',
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Agent Module</h1>
        <p className="text-muted-foreground">
          Intelligent AI assistant with RAG capabilities and token management
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg bg-muted ${feature.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </div>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link to={feature.href}>
                  <Button className="w-full">
                    Open
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            <strong>1. Configure AI:</strong> Set up your AI provider and model in Configuration
          </p>
          <p className="text-sm">
            <strong>2. Upload Files:</strong> Add knowledge base files in Knowledge Base
          </p>
          <p className="text-sm">
            <strong>3. Start Chatting:</strong> Begin conversations in AI Chat
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

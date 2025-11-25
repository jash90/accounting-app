import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, BarChart3, FolderOpen, ArrowRight } from 'lucide-react';

export default function CompanyAIAgentDashboard() {
  const features = [
    {
      title: 'AI Chat',
      description: 'Start conversations with the AI assistant. Get intelligent responses based on your company knowledge base.',
      icon: MessageSquare,
      href: '/company/modules/ai-agent/chat',
      color: 'text-blue-500',
    },
    {
      title: 'Token Usage',
      description: 'Monitor AI usage across your company. View statistics per user and track token consumption.',
      icon: BarChart3,
      href: '/company/modules/ai-agent/token-usage',
      color: 'text-orange-500',
    },
    {
      title: 'Knowledge Base Files',
      description: 'Upload and manage company-specific PDF, TXT, and MD files for enhanced AI responses.',
      icon: FolderOpen,
      href: '/company/modules/ai-agent/context',
      color: 'text-green-500',
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Agent Module</h1>
        <p className="text-muted-foreground">
          Intelligent AI assistant for your company
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
          <CardTitle>Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            ✓ <strong>Smart Conversations:</strong> AI learns from your uploaded documents
          </p>
          <p className="text-sm">
            ✓ <strong>Token Tracking:</strong> Monitor usage and costs per employee
          </p>
          <p className="text-sm">
            ✓ <strong>RAG Technology:</strong> AI answers based on your company files
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

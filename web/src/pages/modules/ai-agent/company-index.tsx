import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, BarChart3, FolderOpen, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export default function CompanyAIAgentDashboard() {
  const features = [
    {
      title: 'AI Chat',
      description: 'Start conversations with the AI assistant. Get intelligent responses based on your company knowledge base.',
      icon: MessageSquare,
      href: '/company/modules/ai-agent/chat',
      gradient: 'bg-apptax-ai-gradient',
    },
    {
      title: 'Token Usage',
      description: 'Monitor AI usage across your company. View statistics per user and track token consumption.',
      icon: BarChart3,
      href: '/company/modules/ai-agent/token-usage',
      gradient: 'bg-apptax-gradient',
    },
    {
      title: 'Knowledge Base Files',
      description: 'Upload and manage company-specific PDF, TXT, and MD files for enhanced AI responses.',
      icon: FolderOpen,
      href: '/company/modules/ai-agent/context',
      gradient: 'bg-apptax-dark-gradient',
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-apptax-navy flex items-center gap-3">
          AI Agent Module
          <div className="w-3 h-3 rounded-full bg-apptax-teal ai-glow" />
        </h1>
        <p className="text-muted-foreground mt-1">
          Intelligent AI assistant for your company
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title} className="hover:shadow-apptax-md transition-all duration-200 hover:border-apptax-blue">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${feature.gradient} text-white ai-glow`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-apptax-navy">{feature.title}</CardTitle>
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

      <Card className="bg-apptax-warm-gray border-0">
        <CardHeader>
          <CardTitle className="text-apptax-navy flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-apptax-teal" />
            Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-apptax-teal mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-apptax-navy">Smart Conversations</p>
              <p className="text-sm text-muted-foreground">
                AI learns from your uploaded documents
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-apptax-teal mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-apptax-navy">Token Tracking</p>
              <p className="text-sm text-muted-foreground">
                Monitor usage and costs per employee
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-apptax-teal mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-apptax-navy">RAG Technology</p>
              <p className="text-sm text-muted-foreground">
                AI answers based on your company files
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

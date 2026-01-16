import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Settings, FolderOpen, BarChart3, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export default function AdminAIAgentDashboard() {
  const features = [
    {
      title: 'Czat AI',
      description: 'Rozpocznij rozmowy z asystentem AI. Uzyskaj inteligentne odpowiedzi na podstawie bazy wiedzy.',
      icon: MessageSquare,
      href: '/admin/modules/ai-agent/chat',
      gradient: 'bg-apptax-ai-gradient',
    },
    {
      title: 'Konfiguracja AI',
      description: 'Skonfiguruj dostawcę AI (OpenAI/OpenRouter), model, klucze API i prompt systemowy.',
      icon: Settings,
      href: '/admin/modules/ai-agent/configuration',
      gradient: 'bg-apptax-gradient',
    },
    {
      title: 'Pliki bazy wiedzy',
      description: 'Prześlij i zarządzaj plikami PDF, TXT i MD dla RAG (Retrieval Augmented Generation).',
      icon: FolderOpen,
      href: '/admin/modules/ai-agent/context',
      gradient: 'bg-apptax-dark-gradient',
    },
    {
      title: 'Zużycie tokenów',
      description: 'Zobacz zużycie tokenów we wszystkich firmach w systemie.',
      icon: BarChart3,
      href: '/admin/modules/ai-agent/token-usage',
      gradient: 'bg-gradient-to-br from-apptax-teal to-apptax-navy',
    },
  ];

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-apptax-navy flex items-center gap-3">
          Moduł Agent AI
          <div className="w-3 h-3 rounded-full bg-apptax-teal ai-glow" />
        </h1>
        <p className="text-muted-foreground mt-1">
          Inteligentny asystent AI z funkcjami RAG i zarządzaniem tokenami
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card
              key={feature.title}
              className="hover:shadow-apptax-md transition-all duration-300 hover:-translate-y-1 hover:border-apptax-blue group"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${feature.gradient} text-white ai-glow group-hover:shadow-apptax-md transition-shadow`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-apptax-navy">{feature.title}</CardTitle>
                </div>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link to={feature.href}>
                  <Button className="w-full group-hover:shadow-apptax-sm transition-shadow">
                    Otwórz
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
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
            Szybki start
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-apptax-teal mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-apptax-navy">1. Skonfiguruj dostawcę AI</p>
              <p className="text-sm text-muted-foreground">
                Ustaw dostawcę AI (OpenAI/OpenRouter) i model w Konfiguracji
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-apptax-teal mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-apptax-navy">2. Prześlij bazę wiedzy</p>
              <p className="text-sm text-muted-foreground">
                Dodaj pliki PDF, TXT lub MD, aby wzbogacić odpowiedzi AI o Twoje treści
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-apptax-teal mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-apptax-navy">3. Rozpocznij czat</p>
              <p className="text-sm text-muted-foreground">
                Zacznij rozmowy z odpowiedziami AI świadomymi kontekstu
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

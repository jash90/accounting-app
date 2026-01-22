import { MessageSquare, BarChart3, FolderOpen, Sparkles, CheckCircle2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NavigationCard } from '@/components/ui/navigation-card';

export default function CompanyAIAgentDashboard() {
  const features = [
    {
      title: 'Czat AI',
      description:
        'Rozpocznij rozmowy z asystentem AI. Uzyskaj inteligentne odpowiedzi na podstawie bazy wiedzy firmy.',
      icon: MessageSquare,
      href: '/company/modules/ai-agent/chat',
      gradient: 'bg-apptax-ai-gradient',
    },
    {
      title: 'Zużycie tokenów',
      description:
        'Monitoruj użycie AI w firmie. Przeglądaj statystyki użytkowników i śledź zużycie tokenów.',
      icon: BarChart3,
      href: '/company/modules/ai-agent/token-usage',
      gradient: 'bg-apptax-gradient',
    },
    {
      title: 'Pliki bazy wiedzy',
      description:
        'Prześlij i zarządzaj plikami PDF, TXT i MD specyficznymi dla firmy, aby ulepszyć odpowiedzi AI.',
      icon: FolderOpen,
      href: '/company/modules/ai-agent/context',
      gradient: 'bg-apptax-dark-gradient',
    },
  ];

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-apptax-navy flex items-center gap-3 text-3xl font-bold">
          Moduł Agent AI
          <div className="bg-apptax-teal ai-glow h-3 w-3 rounded-full" />
        </h1>
        <p className="text-muted-foreground mt-1">Inteligentny asystent AI dla Twojej firmy</p>
      </div>

      <div className="flex flex-wrap gap-6">
        {features.map((feature) => (
          <NavigationCard
            key={feature.title}
            title={feature.title}
            description={feature.description}
            icon={feature.icon}
            href={feature.href}
            gradient={feature.gradient}
          />
        ))}
      </div>

      <Card className="bg-apptax-warm-gray border-0">
        <CardHeader>
          <CardTitle className="text-apptax-navy flex items-center gap-2">
            <Sparkles className="text-apptax-teal h-5 w-5" />
            Funkcje
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="text-apptax-teal mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="text-apptax-navy font-medium">Inteligentne rozmowy</p>
              <p className="text-muted-foreground text-sm">AI uczy się z przesłanych dokumentów</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="text-apptax-teal mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="text-apptax-navy font-medium">Śledzenie tokenów</p>
              <p className="text-muted-foreground text-sm">
                Monitoruj użycie i koszty per pracownik
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="text-apptax-teal mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="text-apptax-navy font-medium">Technologia RAG</p>
              <p className="text-muted-foreground text-sm">
                AI odpowiada na podstawie plików firmy
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

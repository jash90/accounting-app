import { MessageSquare, CheckCircle2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NavigationCard } from '@/components/ui/navigation-card';

export default function EmployeeAIAgentDashboard() {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-apptax-navy flex items-center gap-3 text-3xl font-bold">
          Moduł Agent AI
          <div className="bg-apptax-teal ai-glow h-3 w-3 rounded-full" />
        </h1>
        <p className="text-muted-foreground mt-1">
          Twój inteligentny asystent AI zasilany zaawansowanymi modelami językowymi
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <NavigationCard
          title="Czat AI"
          description="Rozpocznij rozmowy i uzyskaj inteligentne odpowiedzi. Zadawaj pytania, uzyskaj pomoc przy zadaniach i wykorzystaj AI do zwiększenia produktywności."
          icon={MessageSquare}
          href="/modules/ai-agent/chat"
          gradient="bg-apptax-ai-gradient"
          buttonText="Rozpocznij czat"
        />

        <Card className="bg-apptax-warm-gray border-0">
          <CardHeader>
            <CardTitle className="text-apptax-navy">Funkcje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-apptax-teal mt-0.5 h-5 w-5 flex-shrink-0" />
              <div>
                <p className="text-apptax-navy font-medium">Inteligentne rozmowy</p>
                <p className="text-muted-foreground text-sm">
                  AI rozumie kontekst z dokumentów Twojej firmy
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-apptax-teal mt-0.5 h-5 w-5 flex-shrink-0" />
              <div>
                <p className="text-apptax-navy font-medium">Historia rozmów</p>
                <p className="text-muted-foreground text-sm">
                  Dostęp do wszystkich poprzednich rozmów w każdej chwili
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-apptax-teal mt-0.5 h-5 w-5 flex-shrink-0" />
              <div>
                <p className="text-apptax-navy font-medium">Zawsze dostępny</p>
                <p className="text-muted-foreground text-sm">Asystent AI gotowy do pomocy 24/7</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

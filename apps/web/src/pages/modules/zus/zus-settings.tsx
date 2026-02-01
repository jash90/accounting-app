import { useNavigate } from 'react-router-dom';

import { ArrowLeft, Calculator, Info, Percent, Settings, Shield } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthContext } from '@/contexts/auth-context';
import { useZusRates } from '@/lib/hooks/use-zus';
import { UserRole } from '@/types/enums';

export default function ZusSettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { data: rates, isLoading } = useZusRates();

  const getBasePath = () => {
    switch (user?.role) {
      case UserRole.ADMIN:
        return '/admin/modules/zus';
      case UserRole.COMPANY_OWNER:
        return '/company/modules/zus';
      default:
        return '/modules/zus';
    }
  };

  const basePath = getBasePath();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(basePath)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót do modułu
        </Button>
        <PageHeader
          title="Ustawienia modułu ZUS"
          description="Konfiguracja i informacje o aktualnych stawkach ZUS"
          icon={<Settings className="h-6 w-6" />}
        />
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Informacja</AlertTitle>
        <AlertDescription>
          Stawki ZUS są aktualizowane automatycznie na podstawie oficjalnych komunikatów ZUS.
          Poniższe wartości obowiązują dla bieżącego roku.
        </AlertDescription>
      </Alert>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : rates ? (
        <div className="space-y-6">
          {/* Contribution Rates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Stawki składek społecznych
              </CardTitle>
              <CardDescription>
                Procentowe stawki składek obowiązujące w {rates.year} roku
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-muted-foreground text-sm">Emerytalna</p>
                  <p className="text-2xl font-bold">19.52%</p>
                  <p className="text-muted-foreground text-xs">Obowiązkowa dla wszystkich</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-muted-foreground text-sm">Rentowa</p>
                  <p className="text-2xl font-bold">8.00%</p>
                  <p className="text-muted-foreground text-xs">Obowiązkowa dla wszystkich</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-muted-foreground text-sm">Chorobowa</p>
                  <p className="text-2xl font-bold">2.45%</p>
                  <p className="text-muted-foreground text-xs">Dobrowolna dla przedsiębiorców</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-muted-foreground text-sm">Wypadkowa</p>
                  <p className="text-2xl font-bold">1.67%</p>
                  <p className="text-muted-foreground text-xs">Dla firm do 9 osób</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-muted-foreground text-sm">Fundusz Pracy</p>
                  <p className="text-2xl font-bold">2.45%</p>
                  <p className="text-muted-foreground text-xs">Obowiązkowy przy pełnej składce</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basis Amounts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Podstawy wymiaru składek
              </CardTitle>
              <CardDescription>
                Kwoty bazowe do obliczania składek w {rates.year} roku
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border p-4 bg-primary/5">
                  <p className="text-muted-foreground text-sm">Pełny ZUS</p>
                  <p className="text-2xl font-bold text-primary">{rates.fullBasisPln} PLN</p>
                  <p className="text-muted-foreground text-xs">60% prognozowanego wynagrodzenia</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-muted-foreground text-sm">Mały ZUS</p>
                  <p className="text-2xl font-bold">{rates.smallZusBasisPln} PLN</p>
                  <p className="text-muted-foreground text-xs">30% minimalnego wynagrodzenia</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-muted-foreground text-sm">Minimalne wynagrodzenie</p>
                  <p className="text-2xl font-bold">{rates.minimumWagePln} PLN</p>
                  <p className="text-muted-foreground text-xs">Obowiązujące w {rates.year} roku</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-muted-foreground text-sm">Min. składka zdrowotna</p>
                  <p className="text-2xl font-bold">{rates.healthMinPln} PLN</p>
                  <p className="text-muted-foreground text-xs">Minimalna miesięczna kwota</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Discount Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Rodzaje ulg dla przedsiębiorców
              </CardTitle>
              <CardDescription>Dostępne ulgi i preferencje w opłacaniu składek ZUS</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">Ulga na start</h4>
                      <p className="text-muted-foreground text-sm">
                        Zwolnienie ze składek społecznych przez 6 miesięcy od rozpoczęcia
                        działalności
                      </p>
                    </div>
                    <Badge>6 miesięcy</Badge>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">Mały ZUS</h4>
                      <p className="text-muted-foreground text-sm">
                        Preferencyjne składki od 30% minimalnego wynagrodzenia przez 24 miesiące
                      </p>
                    </div>
                    <Badge variant="secondary">24 miesiące</Badge>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">Mały ZUS Plus</h4>
                      <p className="text-muted-foreground text-sm">
                        Składki od przychodu dla przedsiębiorców o niskich przychodach (do 36
                        miesięcy w 60-miesięcznym oknie)
                      </p>
                    </div>
                    <Badge variant="secondary">36 miesięcy</Badge>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">Pełny ZUS</h4>
                      <p className="text-muted-foreground text-sm">
                        Standardowe składki od 60% prognozowanego przeciętnego wynagrodzenia
                      </p>
                    </div>
                    <Badge variant="outline">Bez ulgi</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Health Contribution Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Składka zdrowotna
              </CardTitle>
              <CardDescription>Wysokość składki zależy od formy opodatkowania</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">Skala podatkowa</h4>
                      <p className="text-muted-foreground text-sm">
                        9% od dochodu, minimum {rates.healthMinPln} PLN
                      </p>
                    </div>
                    <Badge>9%</Badge>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">Podatek liniowy</h4>
                      <p className="text-muted-foreground text-sm">
                        4.9% od dochodu, minimum {rates.healthMinPln} PLN
                      </p>
                    </div>
                    <Badge variant="secondary">4.9%</Badge>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">Ryczałt</h4>
                      <p className="text-muted-foreground text-sm">
                        Stałe kwoty zależne od progu przychodów: 461.66 / 769.43 / 1384.97 PLN
                      </p>
                    </div>
                    <Badge variant="outline">Stałe progi</Badge>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">Karta podatkowa</h4>
                      <p className="text-muted-foreground text-sm">
                        Stała kwota {rates.healthMinPln} PLN miesięcznie
                      </p>
                    </div>
                    <Badge variant="outline">Stała kwota</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Deadlines */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Terminy płatności
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-muted-foreground text-sm">Osoby fizyczne</p>
                  <p className="text-2xl font-bold">10</p>
                  <p className="text-muted-foreground text-xs">dzień miesiąca</p>
                </div>
                <div className="rounded-lg border p-4 bg-primary/5">
                  <p className="text-muted-foreground text-sm">Przedsiębiorcy</p>
                  <p className="text-2xl font-bold text-primary">15</p>
                  <p className="text-muted-foreground text-xs">dzień miesiąca</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-muted-foreground text-sm">Spółki</p>
                  <p className="text-2xl font-bold">20</p>
                  <p className="text-muted-foreground text-xs">dzień miesiąca</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">Nie udało się załadować stawek ZUS</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

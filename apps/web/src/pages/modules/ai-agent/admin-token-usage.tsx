import { useState } from 'react';

import {
  Building2,
  ChevronDown,
  ChevronUp,
  Coins,
  MessageSquare,
  Sparkles,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAllCompaniesTokenUsage } from '@/lib/hooks/use-ai-agent';
import { type CompanyTokenUsageDto } from '@/types/dtos';

function CompanyRow({ company }: { company: CompanyTokenUsageDto }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <TableRow
        className="hover:bg-accent/10/30 cursor-pointer transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            <div className="bg-accent/10 flex h-8 w-8 items-center justify-center rounded-lg">
              <Building2 className="text-primary h-4 w-4" />
            </div>
            <span className="text-foreground">{company.companyName}</span>
          </div>
        </TableCell>
        <TableCell className="text-primary text-right font-semibold">
          {company.totalTokens.toLocaleString()}
        </TableCell>
        <TableCell className="text-right">{company.totalInputTokens.toLocaleString()}</TableCell>
        <TableCell className="text-right">{company.totalOutputTokens.toLocaleString()}</TableCell>
        <TableCell className="text-right">{company.userCount}</TableCell>
        <TableCell className="text-right">{company.conversationCount}</TableCell>
        <TableCell className="text-right">{company.messageCount}</TableCell>
        <TableCell>
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-accent/10"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronUp className="text-foreground h-4 w-4" />
            ) : (
              <ChevronDown className="text-foreground h-4 w-4" />
            )}
          </Button>
        </TableCell>
      </TableRow>
      {isExpanded && company.users.length > 0 && (
        <TableRow>
          <TableCell colSpan={8} className="bg-accent/10/20 p-0">
            <div className="px-8 py-4">
              <h4 className="text-foreground mb-3 text-sm font-medium">Szczegóły użytkowników</h4>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted">
                    <TableHead className="text-foreground font-semibold">Użytkownik</TableHead>
                    <TableHead className="text-foreground text-right font-semibold">
                      Razem tokenów
                    </TableHead>
                    <TableHead className="text-foreground text-right font-semibold">
                      Wejście
                    </TableHead>
                    <TableHead className="text-foreground text-right font-semibold">
                      Wyjście
                    </TableHead>
                    <TableHead className="text-foreground text-right font-semibold">
                      Rozmowy
                    </TableHead>
                    <TableHead className="text-foreground text-right font-semibold">
                      Wiadomości
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {company.users.map((user) => (
                    <TableRow key={user.userId} className="hover:bg-accent/10/30 transition-colors">
                      <TableCell className="text-foreground">
                        {user.firstName} {user.lastName}
                        <br />
                        <span className="text-muted-foreground text-xs">{user.email}</span>
                      </TableCell>
                      <TableCell className="text-primary text-right font-medium">
                        {user.totalTokens.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.totalInputTokens.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.totalOutputTokens.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">{user.conversationCount}</TableCell>
                      <TableCell className="text-right">{user.messageCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TableCell>
        </TableRow>
      )}
      {isExpanded && company.users.length === 0 && (
        <TableRow>
          <TableCell colSpan={8} className="bg-accent/10/20 text-muted-foreground py-4 text-center">
            Brak aktywności użytkowników w tej firmie
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function AdminTokenUsagePage() {
  const { data: companies, isLoading } = useAllCompaniesTokenUsage();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-foreground flex items-center gap-3">
          <div className="bg-accent ai-glow h-3 w-3 animate-pulse rounded-full" />
          Ładowanie...
        </div>
      </div>
    );
  }

  if (!companies || companies.length === 0) {
    return (
      <div className="container mx-auto p-8">
        <Card className="border-accent/50">
          <CardHeader>
            <CardTitle className="text-foreground">Brak danych o użyciu</CardTitle>
            <CardDescription>Brak danych o zużyciu tokenów z żadnej firmy.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Calculate totals across all companies
  const totals = companies.reduce(
    (acc, company) => ({
      totalTokens: acc.totalTokens + company.totalTokens,
      totalInputTokens: acc.totalInputTokens + company.totalInputTokens,
      totalOutputTokens: acc.totalOutputTokens + company.totalOutputTokens,
      userCount: acc.userCount + company.userCount,
      conversationCount: acc.conversationCount + company.conversationCount,
      messageCount: acc.messageCount + company.messageCount,
    }),
    {
      totalTokens: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      userCount: 0,
      conversationCount: 0,
      messageCount: 0,
    }
  );

  const activeCompanies = companies.filter((c) => c.totalTokens > 0).length;

  return (
    <div className="container mx-auto space-y-8 p-8">
      <div>
        <h1 className="text-foreground flex items-center gap-3 text-3xl font-bold">
          Zużycie tokenów w systemie
          <div className="bg-accent ai-glow h-3 w-3 rounded-full" />
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitoruj zużycie tokenów AI we wszystkich firmach
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-accent/50 hover:shadow-md bg-card transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-foreground text-sm font-medium">Razem tokenów</CardTitle>
            <div className="bg-accent/10 flex h-10 w-10 items-center justify-center rounded-lg">
              <Coins className="text-primary h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-foreground text-3xl font-bold">
              {totals.totalTokens.toLocaleString()}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {totals.totalInputTokens.toLocaleString()} wejście /{' '}
              {totals.totalOutputTokens.toLocaleString()} wyjście
            </p>
          </CardContent>
        </Card>

        <Card className="border-accent/50 hover:shadow-md bg-card transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-foreground text-sm font-medium">Aktywne firmy</CardTitle>
            <div className="bg-accent/10 flex h-10 w-10 items-center justify-center rounded-lg">
              <Building2 className="text-primary h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-foreground text-3xl font-bold">{activeCompanies}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              z {companies.length} wszystkich firm
            </p>
          </CardContent>
        </Card>

        <Card className="border-accent/50 hover:shadow-md bg-card transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-foreground text-sm font-medium">Użytkownicy</CardTitle>
            <div className="bg-accent/10 flex h-10 w-10 items-center justify-center rounded-lg">
              <Users className="text-primary h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-foreground text-3xl font-bold">{totals.userCount}</div>
            <p className="text-muted-foreground mt-1 text-xs">Aktywni użytkownicy AI</p>
          </CardContent>
        </Card>

        <Card className="border-accent/50 hover:shadow-md bg-card transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-foreground text-sm font-medium">Rozmowy</CardTitle>
            <div className="bg-accent/10 flex h-10 w-10 items-center justify-center rounded-lg">
              <MessageSquare className="text-accent h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-foreground text-3xl font-bold">{totals.conversationCount}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              {totals.messageCount} wszystkich wiadomości
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Companies Table */}
      <Card className="border-accent/30">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Sparkles className="text-accent h-5 w-5" />
            Zużycie według firmy
          </CardTitle>
          <CardDescription>
            Kliknij wiersz firmy, aby zobaczyć szczegóły użytkowników
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className="text-foreground font-semibold">Firma</TableHead>
                <TableHead className="text-foreground text-right font-semibold">
                  Razem tokenów
                </TableHead>
                <TableHead className="text-foreground text-right font-semibold">Wejście</TableHead>
                <TableHead className="text-foreground text-right font-semibold">Wyjście</TableHead>
                <TableHead className="text-foreground text-right font-semibold">
                  Użytkownicy
                </TableHead>
                <TableHead className="text-foreground text-right font-semibold">Rozmowy</TableHead>
                <TableHead className="text-foreground text-right font-semibold">
                  Wiadomości
                </TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <CompanyRow key={company.companyId} company={company} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

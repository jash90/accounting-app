import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useAllCompaniesTokenUsage } from '@/lib/hooks/use-ai-agent';
import { Building2, Users, MessageSquare, Coins, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { CompanyTokenUsageDto } from '@/types/dtos';

function CompanyRow({ company }: { company: CompanyTokenUsageDto }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-apptax-soft-teal/30 transition-colors" onClick={() => setIsExpanded(!isExpanded)}>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-apptax-soft-teal rounded-lg flex items-center justify-center">
              <Building2 className="h-4 w-4 text-apptax-blue" />
            </div>
            <span className="text-apptax-navy">{company.companyName}</span>
          </div>
        </TableCell>
        <TableCell className="text-right font-semibold text-apptax-blue">{company.totalTokens.toLocaleString()}</TableCell>
        <TableCell className="text-right">{company.totalInputTokens.toLocaleString()}</TableCell>
        <TableCell className="text-right">{company.totalOutputTokens.toLocaleString()}</TableCell>
        <TableCell className="text-right">{company.userCount}</TableCell>
        <TableCell className="text-right">{company.conversationCount}</TableCell>
        <TableCell className="text-right">{company.messageCount}</TableCell>
        <TableCell>
          <Button variant="ghost" size="sm" className="hover:bg-apptax-soft-teal" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}>
            {isExpanded ? <ChevronUp className="h-4 w-4 text-apptax-navy" /> : <ChevronDown className="h-4 w-4 text-apptax-navy" />}
          </Button>
        </TableCell>
      </TableRow>
      {isExpanded && company.users.length > 0 && (
        <TableRow>
          <TableCell colSpan={8} className="bg-apptax-soft-teal/20 p-0">
            <div className="px-8 py-4">
              <h4 className="text-sm font-medium mb-3 text-apptax-navy">Users Breakdown</h4>
              <Table>
                <TableHeader>
                  <TableRow className="bg-apptax-navy/5 hover:bg-apptax-navy/5">
                    <TableHead className="text-apptax-navy font-semibold">User</TableHead>
                    <TableHead className="text-right text-apptax-navy font-semibold">Total Tokens</TableHead>
                    <TableHead className="text-right text-apptax-navy font-semibold">Input</TableHead>
                    <TableHead className="text-right text-apptax-navy font-semibold">Output</TableHead>
                    <TableHead className="text-right text-apptax-navy font-semibold">Conversations</TableHead>
                    <TableHead className="text-right text-apptax-navy font-semibold">Messages</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {company.users.map((user) => (
                    <TableRow key={user.userId} className="hover:bg-apptax-soft-teal/30 transition-colors">
                      <TableCell className="text-apptax-navy">
                        {user.firstName} {user.lastName}
                        <br />
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </TableCell>
                      <TableCell className="text-right font-medium text-apptax-blue">{user.totalTokens.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{user.totalInputTokens.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{user.totalOutputTokens.toLocaleString()}</TableCell>
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
          <TableCell colSpan={8} className="bg-apptax-soft-teal/20 text-center text-muted-foreground py-4">
            No user activity recorded for this company
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
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-apptax-navy">
          <div className="w-3 h-3 rounded-full bg-apptax-teal ai-glow animate-pulse" />
          Loading...
        </div>
      </div>
    );
  }

  if (!companies || companies.length === 0) {
    return (
      <div className="container mx-auto p-8">
        <Card className="border-apptax-soft-teal/50">
          <CardHeader>
            <CardTitle className="text-apptax-navy">No Usage Data</CardTitle>
            <CardDescription>No token usage data available from any company yet.</CardDescription>
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
    <div className="container mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-apptax-navy flex items-center gap-3">
          System Token Usage
          <div className="w-3 h-3 rounded-full bg-apptax-teal ai-glow" />
        </h1>
        <p className="text-muted-foreground mt-1">Monitor AI token consumption across all companies</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border-apptax-soft-teal/50 hover:shadow-apptax-md transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-apptax-navy">Total Tokens</CardTitle>
            <div className="w-10 h-10 bg-apptax-soft-teal rounded-lg flex items-center justify-center">
              <Coins className="h-5 w-5 text-apptax-blue" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-apptax-navy">{totals.totalTokens.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totals.totalInputTokens.toLocaleString()} input / {totals.totalOutputTokens.toLocaleString()} output
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-apptax-soft-teal/50 hover:shadow-apptax-md transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-apptax-navy">Active Companies</CardTitle>
            <div className="w-10 h-10 bg-apptax-soft-teal rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-apptax-blue" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-apptax-navy">{activeCompanies}</div>
            <p className="text-xs text-muted-foreground mt-1">of {companies.length} total companies</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-apptax-soft-teal/50 hover:shadow-apptax-md transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-apptax-navy">Total Users</CardTitle>
            <div className="w-10 h-10 bg-apptax-soft-teal rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-apptax-blue" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-apptax-navy">{totals.userCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Active AI users</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-apptax-soft-teal/50 hover:shadow-apptax-md transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-apptax-navy">Conversations</CardTitle>
            <div className="w-10 h-10 bg-apptax-soft-teal rounded-lg flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-apptax-teal" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-apptax-navy">{totals.conversationCount}</div>
            <p className="text-xs text-muted-foreground mt-1">{totals.messageCount} total messages</p>
          </CardContent>
        </Card>
      </div>

      {/* Companies Table */}
      <Card className="border-apptax-soft-teal/30">
        <CardHeader>
          <CardTitle className="text-apptax-navy flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-apptax-teal" />
            Usage by Company
          </CardTitle>
          <CardDescription>Click on a company row to see user breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-apptax-navy/5 hover:bg-apptax-navy/5">
                <TableHead className="text-apptax-navy font-semibold">Company</TableHead>
                <TableHead className="text-right text-apptax-navy font-semibold">Total Tokens</TableHead>
                <TableHead className="text-right text-apptax-navy font-semibold">Input</TableHead>
                <TableHead className="text-right text-apptax-navy font-semibold">Output</TableHead>
                <TableHead className="text-right text-apptax-navy font-semibold">Users</TableHead>
                <TableHead className="text-right text-apptax-navy font-semibold">Conversations</TableHead>
                <TableHead className="text-right text-apptax-navy font-semibold">Messages</TableHead>
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

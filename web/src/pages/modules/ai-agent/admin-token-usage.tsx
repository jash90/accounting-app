import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useAllCompaniesTokenUsage } from '@/lib/hooks/use-ai-agent';
import { Building2, Users, MessageSquare, Coins, ChevronDown, ChevronUp } from 'lucide-react';
import { CompanyTokenUsageDto } from '@/types/dtos';

function CompanyRow({ company }: { company: CompanyTokenUsageDto }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setIsExpanded(!isExpanded)}>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            {company.companyName}
          </div>
        </TableCell>
        <TableCell className="text-right font-semibold">{company.totalTokens.toLocaleString()}</TableCell>
        <TableCell className="text-right">{company.totalInputTokens.toLocaleString()}</TableCell>
        <TableCell className="text-right">{company.totalOutputTokens.toLocaleString()}</TableCell>
        <TableCell className="text-right">{company.userCount}</TableCell>
        <TableCell className="text-right">{company.conversationCount}</TableCell>
        <TableCell className="text-right">{company.messageCount}</TableCell>
        <TableCell>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </TableCell>
      </TableRow>
      {isExpanded && company.users.length > 0 && (
        <TableRow>
          <TableCell colSpan={8} className="bg-muted/30 p-0">
            <div className="px-8 py-4">
              <h4 className="text-sm font-medium mb-3 text-muted-foreground">Users Breakdown</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Total Tokens</TableHead>
                    <TableHead className="text-right">Input</TableHead>
                    <TableHead className="text-right">Output</TableHead>
                    <TableHead className="text-right">Conversations</TableHead>
                    <TableHead className="text-right">Messages</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {company.users.map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell>
                        {user.firstName} {user.lastName}
                        <br />
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </TableCell>
                      <TableCell className="text-right font-medium">{user.totalTokens.toLocaleString()}</TableCell>
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
          <TableCell colSpan={8} className="bg-muted/30 text-center text-muted-foreground py-4">
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
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  if (!companies || companies.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>No Usage Data</CardTitle>
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
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Token Usage</h1>
        <p className="text-muted-foreground">Monitor AI token consumption across all companies</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalTokens.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {totals.totalInputTokens.toLocaleString()} input / {totals.totalOutputTokens.toLocaleString()} output
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCompanies}</div>
            <p className="text-xs text-muted-foreground">of {companies.length} total companies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.userCount}</div>
            <p className="text-xs text-muted-foreground">Active AI users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.conversationCount}</div>
            <p className="text-xs text-muted-foreground">{totals.messageCount} total messages</p>
          </CardContent>
        </Card>
      </div>

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Usage by Company</CardTitle>
          <CardDescription>Click on a company row to see user breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead className="text-right">Total Tokens</TableHead>
                <TableHead className="text-right">Input</TableHead>
                <TableHead className="text-right">Output</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead className="text-right">Conversations</TableHead>
                <TableHead className="text-right">Messages</TableHead>
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

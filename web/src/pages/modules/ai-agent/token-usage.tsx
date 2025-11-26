import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCompanyTokenUsage } from '@/lib/hooks/use-ai-agent';
import { TrendingUp, Users, MessageSquare, Coins, Sparkles } from 'lucide-react';

export default function TokenUsagePage() {
  const { data: usage, isLoading } = useCompanyTokenUsage();

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

  if (!usage) {
    return (
      <div className="container mx-auto p-8">
        <Card className="border-apptax-soft-teal/50">
          <CardHeader>
            <CardTitle className="text-apptax-navy">No Usage Data</CardTitle>
            <CardDescription>No token usage data available yet.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-apptax-navy flex items-center gap-3">
          Token Usage
          <div className="w-3 h-3 rounded-full bg-apptax-teal ai-glow" />
        </h1>
        <p className="text-muted-foreground mt-1">Monitor AI usage across your company</p>
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
            <div className="text-3xl font-bold text-apptax-navy">{usage.totalTokens.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {usage.totalInputTokens.toLocaleString()} input • {usage.totalOutputTokens.toLocaleString()} output
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-apptax-soft-teal/50 hover:shadow-apptax-md transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-apptax-navy">Active Users</CardTitle>
            <div className="w-10 h-10 bg-apptax-soft-teal rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-apptax-blue" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-apptax-navy">{usage.userCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Using AI assistant</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-apptax-soft-teal/50 hover:shadow-apptax-md transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-apptax-navy">Conversations</CardTitle>
            <div className="w-10 h-10 bg-apptax-soft-teal rounded-lg flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-apptax-blue" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-apptax-navy">{usage.conversationCount}</div>
            <p className="text-xs text-muted-foreground mt-1">{usage.messageCount} total messages</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-apptax-soft-teal/50 hover:shadow-apptax-md transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-apptax-navy">Avg per User</CardTitle>
            <div className="w-10 h-10 bg-apptax-soft-teal rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-apptax-teal" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-apptax-navy">
              {usage.userCount > 0 ? Math.round(usage.totalTokens / usage.userCount).toLocaleString() : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Tokens per user</p>
          </CardContent>
        </Card>
      </div>

      {/* User Breakdown Table */}
      <Card className="border-apptax-soft-teal/30">
        <CardHeader>
          <CardTitle className="text-apptax-navy flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-apptax-teal" />
            Usage by User
          </CardTitle>
          <CardDescription>Detailed breakdown of token usage per employee</CardDescription>
        </CardHeader>
        <CardContent>
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
              {(usage.users ?? []).map((user) => (
                <TableRow key={user.userId} className="hover:bg-apptax-soft-teal/30 transition-colors">
                  <TableCell className="font-medium text-apptax-navy">
                    {user.firstName} {user.lastName}
                    <br />
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-apptax-blue">{user.totalTokens.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{user.totalInputTokens.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{user.totalOutputTokens.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{user.conversationCount}</TableCell>
                  <TableCell className="text-right">{user.messageCount}</TableCell>
                </TableRow>
              ))}
              {usage.users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No usage data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

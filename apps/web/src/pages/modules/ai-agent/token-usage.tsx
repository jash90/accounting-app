import { Coins, MessageSquare, Sparkles, TrendingUp, Users } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCompanyTokenUsage } from '@/lib/hooks/use-ai-agent';

export default function TokenUsagePage() {
  const { data: usage, isLoading } = useCompanyTokenUsage();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-foreground flex items-center gap-3">
          <div className="bg-accent ai-glow h-3 w-3 animate-pulse rounded-full" />
          Loading...
        </div>
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="container mx-auto p-8">
        <Card className="border-accent/50">
          <CardHeader>
            <CardTitle className="text-foreground">No Usage Data</CardTitle>
            <CardDescription>No token usage data available yet.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-8 p-8">
      <div>
        <h1 className="text-foreground flex items-center gap-3 text-3xl font-bold">
          Token Usage
          <div className="bg-accent ai-glow h-3 w-3 rounded-full" />
        </h1>
        <p className="text-muted-foreground mt-1">Monitor AI usage across your company</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-accent/50 hover:shadow-md bg-card transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-foreground text-sm font-medium">Total Tokens</CardTitle>
            <div className="bg-accent/10 flex h-10 w-10 items-center justify-center rounded-lg">
              <Coins className="text-primary h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-foreground text-3xl font-bold">
              {usage.totalTokens.toLocaleString()}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {usage.totalInputTokens.toLocaleString()} input •{' '}
              {usage.totalOutputTokens.toLocaleString()} output
            </p>
          </CardContent>
        </Card>

        <Card className="border-accent/50 hover:shadow-md bg-card transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-foreground text-sm font-medium">Active Users</CardTitle>
            <div className="bg-accent/10 flex h-10 w-10 items-center justify-center rounded-lg">
              <Users className="text-primary h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-foreground text-3xl font-bold">{usage.userCount}</div>
            <p className="text-muted-foreground mt-1 text-xs">Using AI assistant</p>
          </CardContent>
        </Card>

        <Card className="border-accent/50 hover:shadow-md bg-card transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-foreground text-sm font-medium">Conversations</CardTitle>
            <div className="bg-accent/10 flex h-10 w-10 items-center justify-center rounded-lg">
              <MessageSquare className="text-primary h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-foreground text-3xl font-bold">{usage.conversationCount}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              {usage.messageCount} total messages
            </p>
          </CardContent>
        </Card>

        <Card className="border-accent/50 hover:shadow-md bg-card transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-foreground text-sm font-medium">Avg per User</CardTitle>
            <div className="bg-accent/10 flex h-10 w-10 items-center justify-center rounded-lg">
              <TrendingUp className="text-accent h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-foreground text-3xl font-bold">
              {usage.userCount > 0
                ? Math.round(usage.totalTokens / usage.userCount).toLocaleString()
                : 0}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">Tokens per user</p>
          </CardContent>
        </Card>
      </div>

      {/* User Breakdown Table */}
      <Card className="border-accent/30">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Sparkles className="text-accent h-5 w-5" />
            Usage by User
          </CardTitle>
          <CardDescription>Detailed breakdown of token usage per employee</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className="text-foreground font-semibold">User</TableHead>
                <TableHead className="text-foreground text-right font-semibold">
                  Total Tokens
                </TableHead>
                <TableHead className="text-foreground text-right font-semibold">Input</TableHead>
                <TableHead className="text-foreground text-right font-semibold">Output</TableHead>
                <TableHead className="text-foreground text-right font-semibold">
                  Conversations
                </TableHead>
                <TableHead className="text-foreground text-right font-semibold">Messages</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(usage.users ?? []).map((user) => (
                <TableRow key={user.userId} className="hover:bg-accent/10/30 transition-colors">
                  <TableCell className="text-foreground font-medium">
                    {user.firstName} {user.lastName}
                    <br />
                    <span className="text-muted-foreground text-xs">{user.email}</span>
                  </TableCell>
                  <TableCell className="text-primary text-right font-semibold">
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
              {usage.users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
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

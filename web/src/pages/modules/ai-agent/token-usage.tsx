import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCompanyTokenUsage } from '@/lib/hooks/use-ai-agent';
import { TrendingUp, Users, MessageSquare, Coins } from 'lucide-react';

export default function TokenUsagePage() {
  const { data: usage, isLoading } = useCompanyTokenUsage();

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  if (!usage) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>No Usage Data</CardTitle>
            <CardDescription>No token usage data available yet.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Token Usage</h1>
        <p className="text-muted-foreground">Monitor AI usage across your company</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usage.totalTokens.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {usage.totalInputTokens.toLocaleString()} input • {usage.totalOutputTokens.toLocaleString()} output
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usage.userCount}</div>
            <p className="text-xs text-muted-foreground">Using AI assistant</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usage.conversationCount}</div>
            <p className="text-xs text-muted-foreground">{usage.messageCount} total messages</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per User</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usage.userCount > 0 ? Math.round(usage.totalTokens / usage.userCount).toLocaleString() : 0}
            </div>
            <p className="text-xs text-muted-foreground">Tokens per user</p>
          </CardContent>
        </Card>
      </div>

      {/* User Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Usage by User</CardTitle>
          <CardDescription>Detailed breakdown of token usage per employee</CardDescription>
        </CardHeader>
        <CardContent>
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
              {(usage.users ?? []).map((user) => (
                <TableRow key={user.userId}>
                  <TableCell className="font-medium">
                    {user.firstName} {user.lastName}
                    <br />
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{user.totalTokens.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{user.totalInputTokens.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{user.totalOutputTokens.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{user.conversationCount}</TableCell>
                  <TableCell className="text-right">{user.messageCount}</TableCell>
                </TableRow>
              ))}
              {usage.users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
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

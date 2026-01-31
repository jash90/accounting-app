import { useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ArrowLeft, Lock, MessageSquare, Send } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useModuleBasePath } from '@/lib/hooks/use-module-base-path';
import {
  useAddSettlementComment,
  useSettlement,
  useSettlementComments,
} from '@/lib/hooks/use-settlements';

import { StatusBadge } from './components/status-badge';

export default function SettlementCommentsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const basePath = useModuleBasePath('settlements');

  const settlementId = id ?? '';

  // Fetch data
  const { data: settlement, isPending: settlementPending } = useSettlement(settlementId);
  const { data: comments, isPending: commentsPending } = useSettlementComments(settlementId);
  const addComment = useAddSettlementComment();

  // Form state
  const [content, setContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    addComment.mutate(
      {
        settlementId,
        data: {
          content: content.trim(),
          isInternal,
        },
      },
      {
        onSuccess: () => {
          setContent('');
          setIsInternal(false);
        },
      }
    );
  };

  const getInitials = (firstName?: string, lastName?: string, email?: string) => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    return email?.charAt(0).toUpperCase() ?? '?';
  };

  const getUserName = (user?: { firstName?: string; lastName?: string; email: string }) => {
    if (!user) return 'Nieznany użytkownik';
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email;
  };

  // Handle missing id
  if (!id) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <h1 className="text-destructive text-2xl font-semibold">Błąd</h1>
        <p className="text-muted-foreground mt-2">Nie podano identyfikatora rozliczenia</p>
        <Button onClick={() => navigate(`${basePath}/list`)} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót do listy
        </Button>
      </div>
    );
  }

  if (settlementPending) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-48 lg:col-span-2" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!settlement) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(`${basePath}/list`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót do listy
        </Button>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-destructive">Nie znaleziono rozliczenia</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const monthYearLabel = `${settlement.month.toString().padStart(2, '0')}/${settlement.year}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(`${basePath}/list`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót
        </Button>
      </div>

      <PageHeader
        title="Komentarze do rozliczenia"
        description={`${settlement.client?.name ?? 'Nieznany klient'} - ${monthYearLabel}`}
        icon={<MessageSquare className="h-6 w-6" />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Settlement Info Card */}
        <Card className="border-apptax-soft-teal/30">
          <CardHeader>
            <CardTitle className="text-lg">Informacje o rozliczeniu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-muted-foreground text-sm">Klient</p>
              <p className="text-apptax-navy font-medium">{settlement.client?.name ?? '-'}</p>
              {settlement.client?.nip && (
                <p className="text-muted-foreground text-xs">NIP: {settlement.client.nip}</p>
              )}
            </div>

            <div>
              <p className="text-muted-foreground text-sm">Okres</p>
              <p className="text-apptax-navy font-medium">{monthYearLabel}</p>
            </div>

            <div>
              <p className="text-muted-foreground text-sm">Status</p>
              <StatusBadge status={settlement.status} />
            </div>

            <div>
              <p className="text-muted-foreground text-sm">Przypisany do</p>
              <p className="text-apptax-navy font-medium">
                {settlement.assignedUser ? getUserName(settlement.assignedUser) : 'Nieprzypisany'}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground text-sm">Liczba faktur</p>
              <p className="text-apptax-navy font-medium">{settlement.invoiceCount}</p>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <div className="space-y-4 lg:col-span-2">
          {/* Add Comment Form */}
          <Card className="border-apptax-soft-teal/30">
            <CardHeader>
              <CardTitle className="text-lg">Dodaj komentarz</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Textarea
                  placeholder="Wpisz treść komentarza..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={3}
                  className="resize-none"
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isInternal"
                      checked={isInternal}
                      onCheckedChange={(checked) => setIsInternal(checked === true)}
                    />
                    <Label
                      htmlFor="isInternal"
                      className="flex items-center gap-1 text-sm cursor-pointer"
                    >
                      <Lock className="h-3 w-3" />
                      Komentarz wewnętrzny
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    disabled={!content.trim() || addComment.isPending}
                    className="bg-apptax-blue hover:bg-apptax-blue/90"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {addComment.isPending ? 'Wysyłanie...' : 'Wyślij'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Comments List */}
          <Card className="border-apptax-soft-teal/30">
            <CardHeader>
              <CardTitle className="text-lg">Historia komentarzy</CardTitle>
              <CardDescription>
                {comments?.length ?? 0} {comments?.length === 1 ? 'komentarz' : 'komentarzy'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {commentsPending ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !comments || comments.length === 0 ? (
                <div className="py-8 text-center">
                  <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground mt-2">Brak komentarzy</p>
                  <p className="text-muted-foreground text-sm">
                    Dodaj pierwszy komentarz do tego rozliczenia
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-apptax-soft-teal text-apptax-navy">
                          {getInitials(
                            comment.user?.firstName,
                            comment.user?.lastName,
                            comment.user?.email
                          )}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-apptax-navy font-medium text-sm">
                            {getUserName(comment.user)}
                          </span>
                          {comment.isInternal && (
                            <Badge variant="secondary" className="text-xs">
                              <Lock className="mr-1 h-3 w-3" />
                              Wewnętrzny
                            </Badge>
                          )}
                          <span className="text-muted-foreground text-xs">
                            {format(new Date(comment.createdAt), 'dd.MM.yyyy HH:mm', {
                              locale: pl,
                            })}
                          </span>
                        </div>

                        <div className="bg-muted/50 mt-1 rounded-lg p-3">
                          <p className="whitespace-pre-wrap text-sm">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

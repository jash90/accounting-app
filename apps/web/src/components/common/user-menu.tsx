import { useNavigate } from 'react-router-dom';

import { Building2, LogOut, Mail, Palette, Settings, User } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthContext } from '@/contexts/auth-context';
import { UserRole } from '@/types/enums';

export function UserMenu() {
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();

  if (!user) return null;

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

  // Get company email config path based on user role (Admin and Company Owner only)
  const getCompanyEmailConfigPath = () => {
    switch (user.role) {
      case UserRole.ADMIN:
        return '/admin/email-config';
      case UserRole.COMPANY_OWNER:
        return '/company/email-config';
      default:
        return null;
    }
  };

  const companyEmailConfigPath = getCompanyEmailConfigPath();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          data-testid="user-menu-button"
          variant="ghost"
          className="hover:bg-accent/10 relative h-10 w-10 rounded-full transition-colors"
        >
          <Avatar>
            <AvatarFallback className="bg-primary font-semibold text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="shadow-md w-56" align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-foreground text-sm font-semibold">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-muted-foreground text-xs">{user.email}</p>
            <Badge variant="outline" className="border-primary text-primary mt-1 w-fit text-xs">
              {user.role}
            </Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="hover:bg-accent/10 cursor-pointer">
          <User className="text-foreground mr-2 h-4 w-4" />
          Profil
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate('/settings/account')}
          className="hover:bg-accent/10 cursor-pointer"
        >
          <Settings className="text-foreground mr-2 h-4 w-4" />
          Ustawienia konta
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate('/settings/appearance')}
          className="hover:bg-accent/10 cursor-pointer"
        >
          <Palette className="text-foreground mr-2 h-4 w-4" />
          Wygląd
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate('/settings/email-config')}
          className="hover:bg-accent/10 cursor-pointer"
        >
          <Mail className="text-foreground mr-2 h-4 w-4" />
          Konto email
        </DropdownMenuItem>
        {companyEmailConfigPath && (
          <DropdownMenuItem
            onClick={() => navigate(companyEmailConfigPath)}
            className="hover:bg-accent/10 cursor-pointer"
          >
            <Building2 className="text-foreground mr-2 h-4 w-4" />
            Konto firmowe email
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          data-testid="logout-button"
          onClick={logout}
          className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Wyloguj
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

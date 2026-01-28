import { useNavigate } from 'react-router-dom';

import { User, LogOut, Settings, Mail, Building2 } from 'lucide-react';

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
          className="hover:bg-apptax-soft-teal relative h-10 w-10 rounded-full transition-colors"
        >
          <Avatar>
            <AvatarFallback className="bg-apptax-blue font-semibold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="shadow-apptax-md w-56" align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-apptax-navy text-sm font-semibold">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-muted-foreground text-xs">{user.email}</p>
            <Badge
              variant="outline"
              className="border-apptax-blue text-apptax-blue mt-1 w-fit text-xs"
            >
              {user.role}
            </Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="hover:bg-apptax-soft-teal cursor-pointer">
          <User className="text-apptax-navy mr-2 h-4 w-4" />
          Profil
        </DropdownMenuItem>
        <DropdownMenuItem className="hover:bg-apptax-soft-teal cursor-pointer">
          <Settings className="text-apptax-navy mr-2 h-4 w-4" />
          Ustawienia
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate('/settings/email-config')}
          className="hover:bg-apptax-soft-teal cursor-pointer"
        >
          <Mail className="text-apptax-navy mr-2 h-4 w-4" />
          Konto email
        </DropdownMenuItem>
        {companyEmailConfigPath && (
          <DropdownMenuItem
            onClick={() => navigate(companyEmailConfigPath)}
            className="hover:bg-apptax-soft-teal cursor-pointer"
          >
            <Building2 className="text-apptax-navy mr-2 h-4 w-4" />
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

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuthContext } from '@/contexts/auth-context';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Settings, Mail, Building2 } from 'lucide-react';
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
          className="relative h-10 w-10 rounded-full hover:bg-apptax-soft-teal transition-colors"
        >
          <Avatar>
            <AvatarFallback className="bg-apptax-blue text-white font-semibold">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 shadow-apptax-md" align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold text-apptax-navy">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            <Badge variant="outline" className="text-xs w-fit mt-1 border-apptax-blue text-apptax-blue">
              {user.role}
            </Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer hover:bg-apptax-soft-teal">
          <User className="mr-2 h-4 w-4 text-apptax-navy" />
          Profil
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer hover:bg-apptax-soft-teal">
          <Settings className="mr-2 h-4 w-4 text-apptax-navy" />
          Ustawienia
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate('/settings/email-config')}
          className="cursor-pointer hover:bg-apptax-soft-teal"
        >
          <Mail className="mr-2 h-4 w-4 text-apptax-navy" />
          Konto email
        </DropdownMenuItem>
        {companyEmailConfigPath && (
          <DropdownMenuItem
            onClick={() => navigate(companyEmailConfigPath)}
            className="cursor-pointer hover:bg-apptax-soft-teal"
          >
            <Building2 className="mr-2 h-4 w-4 text-apptax-navy" />
            Konto firmowe email
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          data-testid="logout-button"
          onClick={logout}
          className="text-destructive cursor-pointer focus:text-destructive focus:bg-destructive/10"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Wyloguj
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

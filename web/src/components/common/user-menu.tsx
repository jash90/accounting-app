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
import { User, LogOut, Settings, Mail } from 'lucide-react';

export function UserMenu() {
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();

  if (!user) return null;

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

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
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer hover:bg-apptax-soft-teal">
          <Settings className="mr-2 h-4 w-4 text-apptax-navy" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate('/settings/email-config')}
          className="cursor-pointer hover:bg-apptax-soft-teal"
        >
          <Mail className="mr-2 h-4 w-4 text-apptax-teal" />
          Email Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          data-testid="logout-button"
          onClick={logout}
          className="text-destructive cursor-pointer focus:text-destructive focus:bg-destructive/10"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

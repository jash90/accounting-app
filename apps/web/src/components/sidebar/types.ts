import { LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  isExternal?: boolean;
}

export interface SidebarProps {
  title: string;
  navItems: NavItem[];
  className?: string;
}

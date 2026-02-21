import {
  BarChart3,
  Bot,
  Briefcase,
  Calculator,
  Calendar,
  CheckSquare,
  Clock,
  CreditCard,
  FileText,
  FolderOpen,
  Mail,
  Package,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';

/**
 * Mapping of icon names (from module.json) to lucide-react icon components.
 * Icon names use kebab-case format (e.g., 'check-square', 'file-text').
 *
 * When adding a new module, ensure the icon name in module.json matches
 * one of the keys in this map.
 */
const iconMap: Record<string, LucideIcon> = {
  package: Package,
  users: Users,
  'check-square': CheckSquare,
  bot: Bot,
  mail: Mail,
  clock: Clock,
  'file-text': FileText,
  calculator: Calculator,
  calendar: Calendar,
  settings: Settings,
  briefcase: Briefcase,
  'bar-chart-3': BarChart3,
  'credit-card': CreditCard,
  'folder-open': FolderOpen,
};

/**
 * Returns the lucide-react icon component for a given icon name.
 * Falls back to Package icon if the icon name is not found or not provided.
 *
 * @param iconName - The icon name from module.json (kebab-case format)
 * @returns LucideIcon component
 *
 * @example
 * ```tsx
 * const IconComponent = getModuleIcon('check-square');
 * <IconComponent className="h-5 w-5" />
 * ```
 */
export function getModuleIcon(iconName?: string | null): LucideIcon {
  if (!iconName) return Package;
  return iconMap[iconName] || Package;
}

/**
 * List of available icon names for module configuration.
 * Use these values in module.json 'icon' field.
 */
export const availableModuleIcons = Object.keys(iconMap);

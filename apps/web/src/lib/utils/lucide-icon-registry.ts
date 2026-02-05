/**
 * Lucide Icon Registry
 *
 * This module provides a curated registry of Lucide icons used in the application.
 * Instead of importing all ~400+ icons via star import (which bloats the bundle by ~150KB+),
 * we explicitly import only the icons we need.
 *
 * To add a new icon:
 * 1. Import it from 'lucide-react'
 * 2. Add it to the ICON_REGISTRY with its PascalCase name as key
 *
 * @see https://vercel.com/docs/frameworks/react#optimizing-bundle-size
 */
import type { ComponentType } from 'react';

import {
  AlertCircle,
  Award,
  BarChart,
  Bell,
  Briefcase,
  Building,
  Building2,
  Calculator,
  Calendar,
  Check,
  Circle,
  Clock,
  CreditCard,
  DollarSign,
  Edit,
  Eye,
  FileText,
  Flag,
  Folder,
  Gift,
  Heart,
  History,
  Image,
  Info,
  Lock,
  Mail,
  MoreHorizontal,
  Package,
  Palette,
  Phone,
  PieChart,
  Receipt,
  RotateCcw,
  Settings,
  Shapes,
  Shield,
  Star,
  Tag,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Unlock,
  Upload,
  User,
  Users,
  Wallet,
  Zap,
  type LucideProps,
} from 'lucide-react';

/**
 * Type for Lucide icon components
 */
export type LucideIconComponent = ComponentType<LucideProps>;

/**
 * Registry mapping icon names (PascalCase) to their components.
 * These are the icons available for dynamic selection in IconSelector and IconBadge.
 */
export const ICON_REGISTRY: Record<string, LucideIconComponent> = {
  // Popular icons for quick selection (from POPULAR_LUCIDE_ICONS in icon-selector.tsx)
  Star,
  Heart,
  Check,
  AlertCircle,
  Info,
  User,
  Users,
  Building,
  Building2,
  Briefcase,
  Calendar,
  Clock,
  Mail,
  Phone,
  FileText,
  Folder,
  Tag,
  Flag,
  Bell,
  Shield,
  Lock,
  Unlock,
  Eye,
  Edit,
  Settings,
  Zap,
  Target,
  Award,
  Gift,
  TrendingUp,
  TrendingDown,
  BarChart,
  PieChart,
  DollarSign,
  CreditCard,
  Wallet,
  Calculator,
  Receipt,
  Package,

  // Additional icons used for UI elements
  Circle, // Fallback icon
  Image, // Custom icon placeholder
  Shapes, // Tab icon
  Upload, // Tab icon
  Palette, // Color picker

  // Action icons commonly used in table/card dropdowns
  MoreHorizontal, // Dropdown trigger
  Trash2, // Delete action
  History, // History/changelog action
  RotateCcw, // Restore action
};

/**
 * Get an icon component by its PascalCase name.
 * Returns the Circle icon as fallback if not found.
 *
 * @param name - PascalCase icon name (e.g., "Star", "AlertCircle")
 * @returns The icon component or Circle as fallback
 */
export function getIconByName(name: string): LucideIconComponent {
  return ICON_REGISTRY[name] ?? Circle;
}

/**
 * Check if an icon exists in the registry.
 *
 * @param name - PascalCase icon name
 * @returns true if the icon exists in the registry
 */
export function hasIcon(name: string): boolean {
  return name in ICON_REGISTRY;
}

/**
 * Get all available icon names.
 *
 * @returns Array of available icon names
 */
export function getAvailableIconNames(): string[] {
  return Object.keys(ICON_REGISTRY);
}

/**
 * Convert kebab-case to PascalCase.
 * Useful when icon names are stored in kebab-case format.
 *
 * @param kebabCase - Icon name in kebab-case (e.g., "alert-circle")
 * @returns PascalCase version (e.g., "AlertCircle")
 */
export function kebabToPascalCase(kebabCase: string): string {
  return kebabCase
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Get an icon component by its kebab-case name.
 * Converts to PascalCase internally and returns the icon.
 *
 * @param kebabName - Icon name in kebab-case (e.g., "alert-circle")
 * @returns The icon component or Circle as fallback
 */
export function getIconByKebabName(kebabName: string): LucideIconComponent {
  const pascalName = kebabToPascalCase(kebabName);
  return getIconByName(pascalName);
}

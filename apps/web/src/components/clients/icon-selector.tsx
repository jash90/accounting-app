import { useState, useCallback, useEffect, useMemo } from 'react';

import * as LucideIcons from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IconTypeLabels } from '@/lib/constants/polish-labels';
import { cn } from '@/lib/utils/cn';
import { IconType } from '@/types/enums';

// Popular Lucide icons for quick selection
const POPULAR_LUCIDE_ICONS = [
  'Star',
  'Heart',
  'Check',
  'AlertCircle',
  'Info',
  'User',
  'Users',
  'Building',
  'Briefcase',
  'Calendar',
  'Clock',
  'Mail',
  'Phone',
  'FileText',
  'Folder',
  'Tag',
  'Flag',
  'Bell',
  'Shield',
  'Lock',
  'Unlock',
  'Eye',
  'Settings',
  'Zap',
  'Target',
  'Award',
  'Gift',
  'TrendingUp',
  'TrendingDown',
  'BarChart',
  'PieChart',
  'DollarSign',
  'CreditCard',
  'Wallet',
  'Calculator',
  'Receipt',
  'Package',
];

// Popular emojis for quick selection
const POPULAR_EMOJIS = [
  '⭐',
  '💰',
  '📊',
  '📈',
  '📉',
  '💵',
  '💳',
  '🏦',
  '🏢',
  '👤',
  '👥',
  '📁',
  '📋',
  '📝',
  '✅',
  '❌',
  '⚠️',
  '❗',
  '❓',
  '🔔',
  '🔒',
  '🔓',
  '🎯',
  '🏆',
  '🎁',
  '📅',
  '⏰',
  '📧',
  '📞',
  '🏷️',
  '🚀',
  '💡',
  '🔧',
  '⚙️',
  '🛡️',
  '✨',
  '💎',
  '🌟',
  '🔥',
  '💪',
];

// Common colors
const PRESET_COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#0ea5e9',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
  '#64748b',
  '#000000',
  '#ffffff',
];

interface IconSelectorProps {
  value: {
    iconType: IconType;
    iconValue?: string;
    color?: string;
    file?: File;
  };
  onChange: (value: {
    iconType: IconType;
    iconValue?: string;
    color?: string;
    file?: File;
  }) => void;
  className?: string;
}

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

export function IconSelector({ value, onChange, className }: IconSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [customEmoji, setCustomEmoji] = useState('');

  // Compute blob URL synchronously during render to avoid setState in effect
  const filePreviewUrl = useMemo(() => {
    if (!value.file) return null;
    return URL.createObjectURL(value.file);
  }, [value.file]);

  // Cleanup blob URLs when they change or on unmount
  useEffect(() => {
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  const handleIconTypeChange = useCallback(
    (type: string) => {
      onChange({
        ...value,
        iconType: type as IconType,
        iconValue: undefined,
        file: undefined,
      });
    },
    [value, onChange]
  );

  const handleLucideIconSelect = useCallback(
    (iconName: string) => {
      onChange({
        ...value,
        iconType: IconType.LUCIDE,
        iconValue: iconName,
      });
    },
    [value, onChange]
  );

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      onChange({
        ...value,
        iconType: IconType.EMOJI,
        iconValue: emoji,
      });
    },
    [value, onChange]
  );

  const handleColorSelect = useCallback(
    (color: string) => {
      onChange({
        ...value,
        color,
      });
    },
    [value, onChange]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > MAX_FILE_SIZE) {
          alert('Plik jest za duży. Maksymalny rozmiar to 1MB.');
          e.target.value = '';
          return;
        }
        onChange({
          ...value,
          iconType: IconType.CUSTOM,
          file,
        });
      }
    },
    [value, onChange]
  );

  const filteredLucideIcons = searchTerm
    ? POPULAR_LUCIDE_ICONS.filter((icon) => icon.toLowerCase().includes(searchTerm.toLowerCase()))
    : POPULAR_LUCIDE_ICONS;

  const renderIconPreview = () => {
    switch (value.iconType) {
      case IconType.LUCIDE: {
        const IconComponent = value.iconValue
          ? (
              LucideIcons as unknown as Record<string, React.ComponentType<LucideIcons.LucideProps>>
            )[value.iconValue]
          : null;
        return IconComponent ? (
          <IconComponent size={32} style={value.color ? { color: value.color } : undefined} />
        ) : (
          <LucideIcons.Circle size={32} className="text-muted-foreground" />
        );
      }
      case IconType.EMOJI:
        return <span className="text-3xl">{value.iconValue || '⭐'}</span>;
      case IconType.CUSTOM:
        return filePreviewUrl ? (
          <img src={filePreviewUrl} alt="Podgląd ikony" className="w-8 h-8 object-contain" />
        ) : (
          <LucideIcons.Image size={32} className="text-muted-foreground" />
        );
      default:
        return <LucideIcons.Circle size={32} className="text-muted-foreground" />;
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Preview */}
      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/50"
          style={
            value.color && value.iconType !== IconType.EMOJI
              ? { borderColor: value.color }
              : undefined
          }
        >
          {renderIconPreview()}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Podgląd ikony</p>
          <p className="text-xs text-muted-foreground">
            {value.iconType === IconType.LUCIDE && value.iconValue && `Lucide: ${value.iconValue}`}
            {value.iconType === IconType.EMOJI && value.iconValue && `Emoji: ${value.iconValue}`}
            {value.iconType === IconType.CUSTOM && value.file && `Plik: ${value.file.name}`}
            {!value.iconValue && !value.file && 'Wybierz ikonę'}
          </p>
        </div>
      </div>

      {/* Icon Type Tabs */}
      <Tabs value={value.iconType} onValueChange={handleIconTypeChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value={IconType.LUCIDE}>
            <LucideIcons.Shapes className="w-4 h-4 mr-2" />
            {IconTypeLabels[IconType.LUCIDE]}
          </TabsTrigger>
          <TabsTrigger value={IconType.EMOJI}>
            <span className="mr-2">😀</span>
            {IconTypeLabels[IconType.EMOJI]}
          </TabsTrigger>
          <TabsTrigger value={IconType.CUSTOM}>
            <LucideIcons.Upload className="w-4 h-4 mr-2" />
            {IconTypeLabels[IconType.CUSTOM]}
          </TabsTrigger>
        </TabsList>

        {/* Lucide Icons */}
        <TabsContent value={IconType.LUCIDE} className="space-y-3">
          <Input
            placeholder="Szukaj ikony..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-1">
            {filteredLucideIcons.map((iconName) => {
              const IconComponent = (
                LucideIcons as unknown as Record<
                  string,
                  React.ComponentType<LucideIcons.LucideProps>
                >
              )[iconName];
              // Only render button if IconComponent exists to avoid empty buttons
              if (!IconComponent) return null;
              return (
                <Button
                  key={iconName}
                  type="button"
                  variant={value.iconValue === iconName ? 'default' : 'outline'}
                  size="icon"
                  className="w-9 h-9"
                  onClick={() => handleLucideIconSelect(iconName)}
                  title={iconName}
                >
                  <IconComponent size={18} />
                </Button>
              );
            })}
          </div>
        </TabsContent>

        {/* Emoji */}
        <TabsContent value={IconType.EMOJI} className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Wpisz emoji..."
              value={customEmoji}
              onChange={(e) => setCustomEmoji(e.target.value)}
              className="w-24"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (customEmoji) {
                  handleEmojiSelect(customEmoji);
                  setCustomEmoji('');
                }
              }}
              disabled={!customEmoji}
            >
              Dodaj
            </Button>
          </div>
          <div className="grid grid-cols-10 gap-2 max-h-48 overflow-y-auto p-1">
            {POPULAR_EMOJIS.map((emoji) => (
              <Button
                key={emoji}
                type="button"
                variant={value.iconValue === emoji ? 'default' : 'outline'}
                size="icon"
                className="w-9 h-9 text-lg"
                onClick={() => handleEmojiSelect(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </TabsContent>

        {/* Custom File */}
        <TabsContent value={IconType.CUSTOM} className="space-y-3">
          <div className="space-y-2">
            <Label>Prześlij plik graficzny</Label>
            <Input
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={handleFileSelect}
            />
            <p className="text-xs text-muted-foreground">
              Obsługiwane formaty: PNG, JPEG, SVG, WebP. Maksymalny rozmiar: 1MB
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Color Picker (for Lucide and Custom types) */}
      {value.iconType !== IconType.EMOJI && (
        <div className="space-y-2">
          <Label>Kolor ikony</Label>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-10 h-10 p-0"
                  style={{ backgroundColor: value.color || 'transparent' }}
                >
                  {!value.color && <LucideIcons.Palette className="w-5 h-5" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3">
                <div className="grid grid-cols-5 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <Button
                      key={color}
                      type="button"
                      variant="outline"
                      size="icon"
                      className={cn(
                        'w-8 h-8 rounded-full p-0',
                        value.color === color && 'ring-2 ring-primary ring-offset-2'
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => handleColorSelect(color)}
                    />
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <Input
                    type="color"
                    value={value.color || '#000000'}
                    onChange={(e) => handleColorSelect(e.target.value)}
                    className="w-10 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    placeholder="#000000"
                    value={value.color || ''}
                    onChange={(e) => handleColorSelect(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </PopoverContent>
            </Popover>
            {value.color && (
              <Button type="button" variant="ghost" size="sm" onClick={() => handleColorSelect('')}>
                Usuń kolor
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

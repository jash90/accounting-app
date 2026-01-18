export enum IconType {
  LUCIDE = 'lucide',
  CUSTOM = 'custom',
  EMOJI = 'emoji',
}

export const IconTypeLabels: Record<IconType, string> = {
  [IconType.LUCIDE]: 'Ikona Lucide',
  [IconType.CUSTOM]: 'Własna grafika',
  [IconType.EMOJI]: 'Emoji',
};

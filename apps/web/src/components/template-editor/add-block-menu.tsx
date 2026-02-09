import {
  AlignLeft,
  FileText,
  Heading,
  List,
  Minus,
  Paperclip,
  PenTool,
  Table,
  User,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ContentBlockType } from '@/types/content-blocks';

import { BLOCK_TYPE_LABELS } from './block-types';

const BLOCK_TYPE_ICONS: Record<ContentBlockType, React.ElementType> = {
  [ContentBlockType.PARAGRAPH]: AlignLeft,
  [ContentBlockType.HEADING]: Heading,
  [ContentBlockType.TABLE]: Table,
  [ContentBlockType.LIST]: List,
  [ContentBlockType.SEPARATOR]: Minus,
  [ContentBlockType.SIGNATURE]: PenTool,
  [ContentBlockType.ATTACHMENT_SECTION]: Paperclip,
  [ContentBlockType.CLIENT_DATA]: User,
};

interface AddBlockMenuProps {
  onAdd: (type: ContentBlockType) => void;
}

export function AddBlockMenu({ onAdd }: AddBlockMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="mr-2 h-4 w-4" />
          Dodaj blok
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {Object.values(ContentBlockType).map((type) => {
          const Icon = BLOCK_TYPE_ICONS[type];
          return (
            <DropdownMenuItem key={type} onClick={() => onAdd(type)}>
              <Icon className="mr-2 h-4 w-4" />
              {BLOCK_TYPE_LABELS[type]}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

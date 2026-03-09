import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type TableBlock } from '@/types/content-blocks';

interface Props {
  block: TableBlock;
  onChange: (block: TableBlock) => void;
}

function emptyRow(cols: number) {
  return {
    cells: Array.from({ length: cols }, () => ({ content: [{ text: '' }] })),
  };
}

export function TableBlockEditor({ block, onChange }: Props) {
  const hasHeaders = !!block.headers;

  const toggleHeaders = (checked: boolean) => {
    if (checked) {
      onChange({ ...block, headers: emptyRow(block.columnCount) });
    } else {
      const { headers: _, ...rest } = block;
      onChange({ ...rest, headers: undefined } as TableBlock);
    }
  };

  const updateHeaderCell = (colIndex: number, text: string) => {
    if (!block.headers) return;
    const cells = [...block.headers.cells];
    cells[colIndex] = { content: [{ text }] };
    onChange({ ...block, headers: { cells } });
  };

  const updateCell = (rowIndex: number, colIndex: number, text: string) => {
    const rows = [...block.rows];
    const cells = [...rows[rowIndex].cells];
    cells[colIndex] = { content: [{ text }] };
    rows[rowIndex] = { cells };
    onChange({ ...block, rows });
  };

  const addRow = () => {
    onChange({ ...block, rows: [...block.rows, emptyRow(block.columnCount)] });
  };

  const removeRow = (index: number) => {
    if (block.rows.length <= 1) return;
    onChange({ ...block, rows: block.rows.filter((_, i) => i !== index) });
  };

  const addColumn = () => {
    const newCount = block.columnCount + 1;
    const headers = block.headers
      ? { cells: [...block.headers.cells, { content: [{ text: '' }] }] }
      : undefined;
    const rows = block.rows.map((row) => ({
      cells: [...row.cells, { content: [{ text: '' }] }],
    }));
    onChange({ ...block, columnCount: newCount, headers, rows });
  };

  const removeColumn = () => {
    if (block.columnCount <= 1) return;
    const newCount = block.columnCount - 1;
    const headers = block.headers ? { cells: block.headers.cells.slice(0, newCount) } : undefined;
    const rows = block.rows.map((row) => ({
      cells: row.cells.slice(0, newCount),
    }));
    onChange({ ...block, columnCount: newCount, headers, rows });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="has-headers"
            checked={hasHeaders}
            onCheckedChange={(checked) => toggleHeaders(!!checked)}
          />
          <Label htmlFor="has-headers" className="text-sm">
            Wiersz nagłówkowy
          </Label>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          Kolumny: {block.columnCount}
          <Button variant="ghost" size="sm" onClick={addColumn} className="h-6 px-1">
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={removeColumn}
            disabled={block.columnCount <= 1}
            className="h-6 px-1"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border">
          {hasHeaders && block.headers && (
            <thead>
              <tr>
                {block.headers.cells.map((cell, colIdx) => (
                  <th key={colIdx} className="border p-1">
                    <Input
                      value={cell.content[0]?.text || ''}
                      onChange={(e) => updateHeaderCell(colIdx, e.target.value)}
                      placeholder="Nagłówek..."
                      className="h-8 font-bold text-sm"
                    />
                  </th>
                ))}
                <th className="border w-10" />
              </tr>
            </thead>
          )}
          <tbody>
            {block.rows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {row.cells.map((cell, colIdx) => (
                  <td key={colIdx} className="border p-1">
                    <Input
                      value={cell.content[0]?.text || ''}
                      onChange={(e) => updateCell(rowIdx, colIdx, e.target.value)}
                      placeholder="..."
                      className="h-8 text-sm"
                    />
                  </td>
                ))}
                <td className="border p-1 w-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeRow(rowIdx)}
                    disabled={block.rows.length <= 1}
                    aria-label="Usuń wiersz"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button variant="outline" size="sm" onClick={addRow}>
        <Plus className="mr-2 h-4 w-4" />
        Dodaj wiersz
      </Button>
    </div>
  );
}

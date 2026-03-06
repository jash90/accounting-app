import type { CSSProperties } from 'react';

import { twi } from 'tw-to-css';

/**
 * Parse a twi() CSS string into a React CSSProperties object.
 * twi() returns e.g. "margin-bottom:0.75rem;line-height:1.625;"
 */
function parseTwi(classes: string): CSSProperties {
  const css = twi(classes);
  const style: Record<string, string> = {};
  for (const decl of css.split(';')) {
    const trimmed = decl.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const prop = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();
    // Convert CSS property to camelCase for React
    const camel = prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    style[camel] = value;
  }
  return style as CSSProperties;
}

/** Merge multiple style objects */
function merge(...styles: CSSProperties[]): CSSProperties {
  return Object.assign({}, ...styles) as CSSProperties;
}

// ── Alignment ────────────────────────────────────────────────────

export const alignLeft: CSSProperties = { textAlign: 'left' };
export const alignCenter: CSSProperties = { textAlign: 'center' };
export const alignRight: CSSProperties = { textAlign: 'right' };
export const alignJustify: CSSProperties = { textAlign: 'justify' };

export function alignStyle(alignment?: string): CSSProperties {
  switch (alignment) {
    case 'center':
      return alignCenter;
    case 'right':
      return alignRight;
    case 'justify':
      return alignJustify;
    default:
      return alignLeft;
  }
}

// ── Block styles ─────────────────────────────────────────────────

export const paragraph = parseTwi('mb-3 leading-relaxed');

const headingBase = parseTwi('font-bold mb-3');
export const headingH1 = merge(parseTwi('text-2xl'), headingBase);
export const headingH2 = merge(parseTwi('text-xl'), headingBase);
export const headingH3 = merge(parseTwi('text-lg'), headingBase);

export const table = merge(parseTwi('mb-4 w-full text-sm'), {
  borderCollapse: 'collapse' as const,
  border: '1px solid #9ca3af',
});
export const tableHeaderRow = parseTwi('bg-gray-100');
export const tableTh: CSSProperties = merge(parseTwi('px-3 py-2 text-left font-semibold'), {
  border: '1px solid #9ca3af',
});
export const tableTd: CSSProperties = merge(parseTwi('px-3 py-2'), {
  border: '1px solid #9ca3af',
});

export const listBulleted: CSSProperties = merge(parseTwi('pl-6 mb-4'), {
  listStyleType: 'disc',
});
export const listNumbered: CSSProperties = merge(parseTwi('pl-6 mb-4'), {
  listStyleType: 'decimal',
});
export const listItem: CSSProperties = { marginBottom: '0.25rem' };

export const separator: CSSProperties = merge(parseTwi('my-4'), {
  borderColor: '#9ca3af',
});

export const signatureGrid: CSSProperties = merge(parseTwi('my-6'), {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '3rem',
});
export const signatureCol: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2rem',
};
export const signatureLabel = parseTwi('text-sm font-semibold');
export const signatureLine: CSSProperties = {
  borderBottom: '1px solid #9ca3af',
  paddingTop: '2rem',
};
export const signaturePlaceholder = parseTwi('text-xs text-gray-500');

export const attachmentContainer = parseTwi('mb-4');
export const attachmentTitle: CSSProperties = merge(parseTwi('font-bold'), {
  marginBottom: '0.25rem',
});
export const attachmentBody = parseTwi('leading-relaxed');

export const clientDataContainer = parseTwi('mb-4');
export const clientDataTitle = parseTwi('mb-2 font-bold');
export const clientDataTable: CSSProperties = merge(parseTwi('w-full text-sm'), {
  borderCollapse: 'collapse' as const,
});
export const clientDataRow: CSSProperties = {
  borderBottom: '1px solid #e5e7eb',
};
export const clientDataLabel: CSSProperties = merge(parseTwi('py-1.5 font-medium text-gray-700'), {
  width: '33.333%',
  paddingRight: '1rem',
});
export const clientDataValue = parseTwi('py-1.5');

export const placeholder: CSSProperties = {
  color: '#2563eb',
  textDecoration: 'underline',
  textDecorationColor: '#60a5fa',
  textDecorationStyle: 'dotted',
};

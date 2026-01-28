interface ChangeDetailRowProps {
  fieldKey: string;
  oldValue: unknown;
  newValue: unknown;
}

function formatFieldName(key: string): string {
  const fieldLabels: Record<string, string> = {
    name: 'Nazwa',
    nip: 'NIP',
    email: 'Email',
    phone: 'Telefon',
    companyStartDate: 'Data rozpoczęcia firmy',
    cooperationStartDate: 'Data rozpoczęcia współpracy',
    companySpecificity: 'Specyfika firmy',
    additionalInfo: 'Dodatkowe informacje',
    gtuCode: 'Kod GTU',
    amlGroup: 'Grupa AML',
    employmentType: 'Forma zatrudnienia',
    vatStatus: 'Status VAT',
    taxScheme: 'Forma opodatkowania',
    zusStatus: 'Status ZUS',
    isActive: 'Aktywny',
  };

  return fieldLabels[key] || key;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '(brak)';
  if (typeof value === 'boolean') return value ? 'Tak' : 'Nie';
  if (typeof value === 'string') {
    // Check if it's a date
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return new Date(value).toLocaleDateString('pl-PL');
    }
    return value || '(brak)';
  }
  return String(value);
}

export function ChangeDetailRow({ fieldKey, oldValue, newValue }: ChangeDetailRowProps) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-apptax-navy font-medium">{formatFieldName(fieldKey)}:</span>
      <span className="text-muted-foreground line-through">{formatValue(oldValue)}</span>
      <span className="text-apptax-blue">→</span>
      <span className="text-apptax-navy">{formatValue(newValue)}</span>
    </div>
  );
}

export default ChangeDetailRow;

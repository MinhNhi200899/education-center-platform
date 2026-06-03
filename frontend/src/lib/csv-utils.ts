/** Parse CSV text into row objects using the first line as headers */
export function parseCsvToRows(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = (values[idx] ?? '').trim();
    });
    rows.push(row);
  }

  return rows;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  result.push(current);
  return result;
}

/** Download JSON rows as a CSV file */
export function downloadCsv(filename: string, headers: string[], rows: Record<string, unknown>[]) {
  const escape = (v: unknown) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export const STUDENT_IMPORT_TEMPLATE_HEADERS = [
  'fullName',
  'dateOfBirth',
  'gender',
  'enrollmentDate',
  'phone',
  'email',
  'address',
];

export const STUDENT_IMPORT_TEMPLATE_ROW = {
  fullName: 'Nguyen Van A',
  dateOfBirth: '2015-05-10',
  gender: 'male',
  enrollmentDate: '2024-09-01',
  phone: '0901234567',
  email: 'student@example.com',
  address: 'Ho Chi Minh City',
};

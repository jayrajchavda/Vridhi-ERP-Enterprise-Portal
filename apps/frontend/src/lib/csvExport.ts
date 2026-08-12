/**
 * Converts array of objects into CSV format and triggers browser download
 */
export function exportToCSV<T extends Record<string, any>>(
  filename: string,
  rows: T[],
  headers?: { key: keyof T; label: string }[]
) {
  if (!rows || rows.length === 0) return;

  const columns = headers || Object.keys(rows[0]).map((k) => ({ key: k as keyof T, label: k }));

  const csvRows: string[] = [];

  // Header row
  csvRows.push(columns.map((c) => `"${String(c.label).replace(/"/g, '""')}"`).join(','));

  // Data rows
  for (const row of rows) {
    const values = columns.map((c) => {
      const val = row[c.key];
      if (val === null || val === undefined) return '""';
      if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csvRows.join('\n'));
  const link = document.createElement('a');
  link.setAttribute('href', csvContent);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

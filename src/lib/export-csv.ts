export function exportToCsv(filename: string, rows: Record<string, any>[], columns: { key: string; label: string }[]) {
  const header = columns.map(c => c.label).join(",");
  const body = rows
    .map(row =>
      columns
        .map(c => {
          const val = String(c.key.split(".").reduce((obj: any, k) => obj?.[k], row) ?? "").replace(/"/g, '""');
          return `"${val}"`;
        })
        .join(",")
    )
    .join("\n");

  const csv = `\uFEFF${header}\n${body}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

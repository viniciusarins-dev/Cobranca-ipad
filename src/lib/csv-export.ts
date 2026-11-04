/**
 * Monta um CSV simples (sem nenhuma dependência nova — o projeto não tinha
 * nenhuma lib de planilha). BOM UTF-8 no início: sem ele, o Excel no
 * Windows abre acentuação em CSV como texto corrompido.
 */
export function buildCsv(headers: string[], rows: (string | number)[][]): string {
  function escapeCell(value: string | number): string {
    const text = String(value);
    // Qualquer caractere que teria significado especial no CSV (separador,
    // aspas, quebra de linha) exige envolver o campo em aspas duplas.
    if (/[",\n;]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(","));
  return `﻿${lines.join("\r\n")}`;
}

/** Dispara o download do CSV no navegador — só client-side (usa document/Blob). */
export function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

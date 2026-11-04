import { describe, expect, it } from "vitest";

import { buildCsv } from "@/lib/csv-export";

describe("buildCsv", () => {
  it("monta cabeçalho + linhas separados por vírgula, com BOM UTF-8 no início", () => {
    const csv = buildCsv(["Data", "Cliente", "Valor"], [["01/03/2026", "Ana", "250.00"]]);

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("Data,Cliente,Valor");
    expect(csv).toContain("01/03/2026,Ana,250.00");
  });

  it("um valor em formato brasileiro (vírgula decimal) fica entre aspas — a vírgula é o próprio separador de coluna", () => {
    const csv = buildCsv(["Valor"], [["250,00"]]);
    expect(csv).toContain('"250,00"');
  });

  it("coloca entre aspas (e escapa aspas internas) um campo que contém vírgula, ponto e vírgula, aspas ou quebra de linha", () => {
    const csv = buildCsv(["Nome"], [['Loja "Centro", filial']]);

    expect(csv).toContain('"Loja ""Centro"", filial"');
  });

  it("várias linhas, separadas por CRLF", () => {
    const csv = buildCsv(["A"], [["1"], ["2"]]);
    const body = csv.slice(1); // remove o BOM pra comparar

    expect(body).toBe("A\r\n1\r\n2");
  });
});

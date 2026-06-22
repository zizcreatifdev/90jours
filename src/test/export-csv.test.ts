import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { exportToCsv } from "@/lib/export-csv";

// ── DOM / global stubs ────────────────────────────────────────────────────────
// jsdom does not implement URL.createObjectURL or the download click.
// We stub Blob to capture the raw CSV string without triggering a download.

const state = { csv: "" };

beforeEach(() => {
  state.csv = "";

  // Replace Blob so we can read the CSV string that was written to it
  vi.stubGlobal(
    "Blob",
    class {
      constructor(parts: BlobPart[]) {
        state.csv = (parts?.[0] as string) ?? "";
      }
    }
  );

  // Stub URL static methods missing from jsdom
  Object.assign(URL, {
    createObjectURL: vi.fn(() => "blob:fake"),
    revokeObjectURL: vi.fn(),
  });

  // Prevent <a>.click() from throwing in jsdom
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── Column fixtures ───────────────────────────────────────────────────────────

const COL_VAL = [{ key: "val", label: "Valeur" }];
const COL_TWO = [
  { key: "a", label: "Prénom" },
  { key: "b", label: "Famille" },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("exportToCsv, headers", () => {
  it("génère le header depuis les labels des colonnes (sans guillemets)", () => {
    exportToCsv("test.csv", [{ val: "x" }], COL_VAL);
    // \uFEFF precedes the header on the first line
    expect(state.csv.split("\n")[0]).toBe("\uFEFFValeur");
  });

  it("sépare plusieurs colonnes par des virgules dans le header", () => {
    exportToCsv("test.csv", [{ a: "Alice", b: "Martin" }], COL_TWO);
    expect(state.csv.split("\n")[0]).toBe("\uFEFFPrénom,Famille");
  });
});

describe("exportToCsv, BOM UTF-8", () => {
  it("commence par le BOM UTF-8 (U+FEFF)", () => {
    exportToCsv("test.csv", [], COL_VAL);
    expect(state.csv.charCodeAt(0)).toBe(0xfeff);
  });
});

describe("exportToCsv, valeurs normales", () => {
  it("entoure chaque valeur de guillemets doubles", () => {
    exportToCsv("test.csv", [{ val: "Alice" }], COL_VAL);
    expect(state.csv.split("\n")[1]).toBe('"Alice"');
  });

  it("génère plusieurs lignes de données correctement séparées", () => {
    exportToCsv("test.csv", [{ val: "Alice" }, { val: "Bob" }], COL_VAL);
    const lines = state.csv.split("\n");
    expect(lines).toHaveLength(3); // BOM+header + 2 lignes
    expect(lines[1]).toBe('"Alice"');
    expect(lines[2]).toBe('"Bob"');
  });
});

describe("exportToCsv, caractères spéciaux", () => {
  it("protège les valeurs contenant des virgules (déjà entre guillemets)", () => {
    exportToCsv("test.csv", [{ val: "Martin, Jr." }], COL_VAL);
    expect(state.csv.split("\n")[1]).toBe('"Martin, Jr."');
  });

  it('échappe les guillemets doubles en les doublant, RFC 4180 ("" → """")', () => {
    exportToCsv("test.csv", [{ val: 'say "hi"' }], COL_VAL);
    expect(state.csv.split("\n")[1]).toBe('"say ""hi"""');
  });

  it("préserve les retours à la ligne dans les valeurs (RFC 4180, champ cité)", () => {
    exportToCsv("test.csv", [{ val: "ligne1\nligne2" }], COL_VAL);
    // Ne pas splitter par \n ici, la valeur en contient un
    expect(state.csv).toContain('"ligne1\nligne2"');
  });
});

describe("exportToCsv, null / undefined", () => {
  it("convertit null en cellule vide (\"\")", () => {
    exportToCsv("test.csv", [{ val: null }], COL_VAL);
    expect(state.csv.split("\n")[1]).toBe('""');
  });

  it("convertit undefined en cellule vide (\"\")", () => {
    exportToCsv("test.csv", [{ val: undefined }], COL_VAL);
    expect(state.csv.split("\n")[1]).toBe('""');
  });
});

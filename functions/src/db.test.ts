import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC_ROOT = join(dirname(fileURLToPath(import.meta.url)));

const FIRESTORE_MODULE_IMPORT =
  /(?:import\s+[^;]*\s+from\s+|require\s*\(\s*)["']firebase-admin\/firestore["']/;

const GET_FIRESTORE_NAMED_IMPORT =
  /import\s*\{[^}]*\bgetFirestore\b[^}]*\}\s*from\s*["'][^"']+["']/;

function listTypeScriptFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTypeScriptFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

function importsFirestoreAdmin(source: string): boolean {
  return FIRESTORE_MODULE_IMPORT.test(source) || GET_FIRESTORE_NAMED_IMPORT.test(source);
}

describe("centralized Firestore accessor", () => {
  it("only db.ts imports firebase-admin/firestore or getFirestore", () => {
    const offenders = listTypeScriptFiles(SRC_ROOT)
      .filter((file) => relative(SRC_ROOT, file) !== "db.ts")
      .filter((file) => importsFirestoreAdmin(readFileSync(file, "utf8")))
      .map((file) => relative(SRC_ROOT, file));

    expect(offenders).toEqual([]);
  });
});

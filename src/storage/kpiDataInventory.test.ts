import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { KNOWN_SCENARIO_KEYS } from "./mortgageState";

const inventoryPath = fileURLToPath(
  new URL("../../docs/kpi-data-inventory.md", import.meta.url)
);
const inventory = readFileSync(inventoryPath, "utf8");

describe("KPI and data structure inventory", () => {
  it("documents exactly the known persisted scenario properties", () => {
    const persistedSection = inventory
      .split("## Persisted scenario inventory")[1]
      ?.split("## KPI inventory")[0];
    expect(persistedSection).toBeTruthy();

    const documented = new Set<string>();
    for (const line of persistedSection!.split("\n")) {
      const firstCell = line.match(/^\|\s*(.*?)\s*\|/)?.[1] ?? "";
      for (const match of firstCell.matchAll(/`([^`]+)`/g)) {
        documented.add(match[1]);
      }
    }
    expect([...documented].sort()).toEqual([...KNOWN_SCENARIO_KEYS].sort());
  });

  it("states the single-source-of-truth rule", () => {
    expect(inventory).toContain("scenario: { ...all user inputs }");
    expect(inventory).toContain("never stored as competing copies");
  });
});

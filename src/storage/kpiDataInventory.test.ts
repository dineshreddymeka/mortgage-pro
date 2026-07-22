import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { KNOWN_SCENARIO_KEYS } from "./mortgageState";

const inventoryPath = fileURLToPath(
  new URL("../../docs/kpi-data-inventory.md", import.meta.url)
);
const inventory = readFileSync(inventoryPath, "utf8");

describe("KPI and data structure inventory", () => {
  it("documents every known persisted scenario property", () => {
    for (const key of KNOWN_SCENARIO_KEYS) {
      expect(inventory, `missing scenario property: ${key}`).toContain(`\`${key}\``);
    }
  });

  it("states the single-source-of-truth rule", () => {
    expect(inventory).toContain("scenario: { ...all user inputs }");
    expect(inventory).toContain("never stored as competing copies");
  });
});

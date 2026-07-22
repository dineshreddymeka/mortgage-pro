import { describe, expect, it, vi } from "vitest";
import {
  fixtureFutureV99,
  fixtureLegacyCategoryHouse,
  fixtureV2Full,
} from "../__fixtures__/scenarioFixtures";
import { buildFullScenarioExport } from "./scenarioExport";
import { applyScenarioImport, parseScenarioImportText } from "./scenarioImport";

describe("scenario import parsing", () => {
  it("parses the current full export from house.scenario", () => {
    const exported = buildFullScenarioExport(fixtureV2Full, {
      id: "007",
      name: "Maple Duplex",
    });

    const result = parseScenarioImportText(JSON.stringify(exported), fixtureV2Full);

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.preview.format).toBe("current-full-export");
    expect(result.preview.houseId).toBe("007");
    expect(result.preview.houseName).toBe("Maple Duplex");
    expect(result.preview.versionLabel).toContain("export v4");
    expect(result.scenario.homePrice).toBe(fixtureV2Full.homePrice);
    expect(result.preview.kpis).toHaveLength(4);
  });

  it("accepts legacy top-level scenario and raw scenario shapes", () => {
    const wrapped = parseScenarioImportText(
      JSON.stringify({ houseId: "003", name: "Legacy", scenario: fixtureV2Full }),
      fixtureV2Full
    );
    const raw = parseScenarioImportText(JSON.stringify(fixtureV2Full), fixtureV2Full);

    expect(wrapped.status).toBe("ready");
    expect(raw.status).toBe("ready");
    if (wrapped.status === "ready") {
      expect(wrapped.preview.format).toBe("legacy-top-level-scenario");
      expect(wrapped.preview.houseId).toBe("003");
    }
    if (raw.status === "ready") {
      expect(raw.preview.format).toBe("raw-scenario");
    }
  });

  it("folds legacy house category sections into a current scenario", () => {
    const result = parseScenarioImportText(
      JSON.stringify(fixtureLegacyCategoryHouse),
      fixtureV2Full
    );

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.preview.format).toBe("legacy-house-categories");
    expect(result.preview.sectionCount).toBe(5);
    expect(result.scenario.homePrice).toBe(350_000);
    expect(result.scenario.monthlyRent).toBe(2400);
    expect(result.warnings.some((warning) => warning.message.includes("folded"))).toBe(true);
  });

  it("preserves unknown fields from a future scenario", () => {
    const future = {
      ...fixtureFutureV99,
      futureAnalysisPanel: { method: "vNext", assumptions: [1, 2, 3] },
    };
    const result = parseScenarioImportText(JSON.stringify(future), fixtureV2Full);

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(
      (result.scenario as unknown as Record<string, unknown>).futureAnalysisPanel
    ).toEqual(
      future.futureAnalysisPanel
    );
    expect(result.preview.unknownFieldCount).toBe(1);
    expect(result.warnings.some((warning) => warning.message.includes("newer"))).toBe(true);
  });

  it("rejects malformed, unrecognized, and invalid scenario JSON", () => {
    const malformed = parseScenarioImportText("{ nope", fixtureV2Full);
    const unrecognized = parseScenarioImportText('{"hello":"world"}', fixtureV2Full);
    const invalid = parseScenarioImportText(
      JSON.stringify({ ...fixtureV2Full, homePrice: "not-a-number" }),
      fixtureV2Full
    );

    expect(malformed.status).toBe("error");
    expect(unrecognized.status).toBe("error");
    expect(invalid.status).toBe("error");
  });
});

describe("safe scenario import application", () => {
  it("does not mutate when parsing fails or confirmation is absent", async () => {
    const failed = parseScenarioImportText("{ bad json", fixtureV2Full);
    const ready = parseScenarioImportText(JSON.stringify(fixtureV2Full), fixtureV2Full);
    const replaceCurrent = vi.fn();
    const createNew = vi.fn();
    const actions = { replaceCurrent, createNew };

    expect(
      await applyScenarioImport(failed, { confirmed: true, mode: "current" }, actions)
    ).toBe(false);
    expect(
      await applyScenarioImport(ready, { confirmed: false, mode: "current" }, actions)
    ).toBe(false);
    expect(replaceCurrent).not.toHaveBeenCalled();
    expect(createNew).not.toHaveBeenCalled();
  });

  it("applies only the confirmed preview to the selected target", async () => {
    const ready = parseScenarioImportText(JSON.stringify(fixtureV2Full), fixtureV2Full);
    const replaceCurrent = vi.fn();
    const createNew = vi.fn();

    expect(
      await applyScenarioImport(
        ready,
        { confirmed: true, mode: "new" },
        { replaceCurrent, createNew }
      )
    ).toBe(true);
    expect(replaceCurrent).not.toHaveBeenCalled();
    expect(createNew).toHaveBeenCalledOnce();
  });
});

import { describe, expect, it } from "vitest";
import { fixtureV2Full } from "../__fixtures__/scenarioFixtures";
import { buildScenarioReportModel } from "./scenarioReportModel";

describe("buildScenarioReportModel", () => {
  it("builds printable sections from deriveScenario/export pipeline", () => {
    const model = buildScenarioReportModel(fixtureV2Full, { houseLabel: "House 001", houseId: "001" });
    expect(model.sections.map((s) => s.id)).toEqual(["property", "mortgage", "rental", "exit", "max-offer"]);
  });
});

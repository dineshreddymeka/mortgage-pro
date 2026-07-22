import { describe, expect, it } from "vitest";
import { resetConfigForTests, setConfigForTests, loadConfig } from "../config.js";
import { mortgageRatesProvider } from "./mortgageRates.js";

describe("mortgageRatesProvider", () => {
  it("uses heuristic when upstream is not configured", async () => {
    resetConfigForTests();
    setConfigForTests(loadConfig({}));
    const suggestions = await mortgageRatesProvider.fetch({ homePrice: 500_000, termYears: 30 });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.targetField).toBe("interestRateApr");
    expect(suggestions[0]?.source).toBe("server-heuristic");
  });
});

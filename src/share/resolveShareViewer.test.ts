import { describe, expect, it } from "vitest";
import { fixtureV2Full } from "../__fixtures__/scenarioFixtures";
import { createMemoryShareSnapshotStore } from "../storage/localShareSnapshotStore";
import { buildShareSnapshotInputFromScenario } from "./buildShareSnapshot";
import { resolveShareViewerRecord } from "./resolveShareViewer";
import { generateShareToken } from "./shareToken";

describe("resolveShareViewerRecord", () => {
  it("returns ready for valid active snapshot", async () => {
    const store = createMemoryShareSnapshotStore();
    const created = await store.create(
      buildShareSnapshotInputFromScenario(fixtureV2Full, "owner", { houseLabel: "House 001", houseId: "001" })
    );
    const resolved = resolveShareViewerRecord(created.shareToken, created);
    expect(resolved.status).toBe("ready");
    if (resolved.status === "ready") {
      expect(resolved.state.homePrice).toBe(fixtureV2Full.homePrice);
    }
  });

  it("surfaces revoked and invalid token states", async () => {
    const store = createMemoryShareSnapshotStore();
    const created = await store.create(
      buildShareSnapshotInputFromScenario(fixtureV2Full, "owner", { houseLabel: "House 001" })
    );
    await store.revoke(created.shareToken, "owner");
    const after = await store.getByToken(created.shareToken);
    expect(resolveShareViewerRecord(created.shareToken, after).status).toBe("revoked");
    expect(resolveShareViewerRecord(generateShareToken(), null).status).toBe("not-found");
    expect(resolveShareViewerRecord("bad", null).status).toBe("invalid-token");
  });
});

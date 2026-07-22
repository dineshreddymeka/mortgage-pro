import { describe, expect, it } from "vitest";
import { fixtureV2Full } from "../__fixtures__/scenarioFixtures";
import { createMemoryShareSnapshotStore } from "../storage/localShareSnapshotStore";
import {
  buildShareSnapshotInputFromScenario,
  buildShareSnapshotPayload,
  hashSharePayload,
  isShareSnapshotActive,
  validateShareSnapshotPayload,
} from "./buildShareSnapshot";

describe("share snapshots", () => {
  it("builds immutable payload with stable content hash", () => {
    const input = buildShareSnapshotInputFromScenario(fixtureV2Full, "uid-test", { houseLabel: "House 001", houseId: "001" });
    const payload = buildShareSnapshotPayload({
      exportDoc: input.exportDoc,
      houseLabel: input.houseLabel,
      houseId: input.houseId,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(validateShareSnapshotPayload(payload)).toBe(true);
    expect(payload.contentHash).toBe(hashSharePayload({ export: payload.export, createdAt: payload.createdAt }));
  });

  it("memory store creates tokenized immutable records", async () => {
    const store = createMemoryShareSnapshotStore();
    const created = await store.create(buildShareSnapshotInputFromScenario(fixtureV2Full, "owner-1", { houseLabel: "House 001" }));
    expect(isShareSnapshotActive(created)).toBe(true);
    await store.revoke(created.shareToken, "owner-1");
    const after = await store.getByToken(created.shareToken);
    expect(isShareSnapshotActive(after!)).toBe(false);
  });
});

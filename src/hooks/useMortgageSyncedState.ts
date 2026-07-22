import { useCallback, useEffect, useRef, useState } from "react";
import { impliedAnnualAppreciationPercent } from "../lib/mortgageMath";
import { isFirebaseConfigured } from "../lib/firebase";
import {
  defaultMortgageState,
  emptyAppState,
  SCHEMA_VERSION,
  serializeMortgageState,
  type AppPersisted,
} from "../storage/mortgageState";
import {
  loadPersistedMortgageState,
  savePersistedMortgageState,
  subscribeMortgageStateRemote,
} from "../storage/localStore";
import {
  archiveProperty,
  createProperty,
  ensureFirebaseUser,
  formatHouseId,
  getProperty,
  houseLabel,
  listProperties,
  listPropertyDocs,
  readActivePropertyId,
  renameProperty,
  restoreProperty,
  savePropertyScenario,
  touchLastOpened,
  writeActivePropertyId,
  type PropertyMeta,
} from "../storage/firestoreProperties";
import { buildHouseComparisonRow, type HouseComparisonRow } from "../lib/houseComparison";

const CLOUD_SAVE_DEBOUNCE_MS = 900;

export type CloudSyncStatus = "off" | "connecting" | "ready" | "error";

export function useMortgageSyncedState() {
  const [state, setState] = useState<AppPersisted>(loadPersistedMortgageState);
  /** Active (non-archived) houses for nav + compare. */
  const [properties, setProperties] = useState<PropertyMeta[]>([]);
  /** Soft-hidden houses; full scenario retained. */
  const [archivedProperties, setArchivedProperties] = useState<PropertyMeta[]>([]);
  const [activePropertyId, setActivePropertyId] = useState<string | null>(readActivePropertyId);
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>(
    isFirebaseConfigured() ? "connecting" : "off"
  );
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [comparisonBase, setComparisonBase] = useState<HouseComparisonRow[]>([]);

  const lastSerialized = useRef(serializeMortgageState(state));
  const stateRef = useRef(state);
  stateRef.current = state;
  const activeIdRef = useRef(activePropertyId);
  activeIdRef.current = activePropertyId;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const cloudReadyRef = useRef(false);
  const skipNextCloudSave = useRef(false);

  const activeMeta = properties.find((p) => p.id === activePropertyId);
  const activeHouseNumber =
    activeMeta?.houseNumber ?? (properties.length > 0 ? properties[0].houseNumber : 1);
  const activeHouseId = activeMeta?.houseId ?? formatHouseId(activeHouseNumber);
  const activeHouseLabel = activeMeta?.name?.trim() || houseLabel(activeHouseId);
  const activeHouseIdRef = useRef(activeHouseId);
  activeHouseIdRef.current = activeHouseId;
  const activeHouseNumberRef = useRef(activeHouseNumber);
  activeHouseNumberRef.current = activeHouseNumber;
  const propertiesRef = useRef(properties);
  propertiesRef.current = properties;
  const archivedRef = useRef(archivedProperties);
  archivedRef.current = archivedProperties;

  /** Business root id (`001`) options for a Firestore doc path. */
  const houseRootOptions = useCallback((firestoreDocId: string | null) => {
    if (!firestoreDocId) return undefined;
    const meta =
      propertiesRef.current.find((p) => p.id === firestoreDocId) ??
      archivedRef.current.find((p) => p.id === firestoreDocId);
    if (meta) return { houseId: meta.houseId, houseNumber: meta.houseNumber };
    if (firestoreDocId === activeIdRef.current) {
      return { houseId: activeHouseIdRef.current, houseNumber: activeHouseNumberRef.current };
    }
    return undefined;
  }, []);

  const refreshLists = useCallback(async (uid: string) => {
    const all = await listProperties(uid);
    const active = all.filter((p) => !p.archived);
    const archived = all.filter((p) => p.archived);
    setProperties(active);
    setArchivedProperties(archived);
    return { active, archived };
  }, []);

  const refreshComparisons = useCallback(async (uid: string) => {
    try {
      // Active houses only — archived never appear in smart compare.
      const docs = await listPropertyDocs(uid, { archived: false });
      setComparisonBase(
        docs.map((d) =>
          buildHouseComparisonRow(d.id, d.houseNumber, d.scenario, d.houseId, d.name)
        )
      );
    } catch (err) {
      console.warn("[firestore] comparison refresh failed", err);
    }
  }, []);

  // Live-compare: use current edits for the active house; saved snapshots for others.
  const comparisons: HouseComparisonRow[] = (() => {
    if (!activePropertyId) return comparisonBase;
    const live = buildHouseComparisonRow(
      activePropertyId,
      activeHouseNumber,
      state,
      activeHouseId,
      activeHouseLabel
    );
    if (comparisonBase.length === 0) return [live];
    const hasActive = comparisonBase.some((r) => r.id === activePropertyId);
    if (!hasActive) {
      return [...comparisonBase, live].sort((a, b) => a.houseNumber - b.houseNumber);
    }
    return comparisonBase.map((r) => (r.id === activePropertyId ? live : r));
  })();

  useEffect(() => {
    return subscribeMortgageStateRemote((remote) => {
      const incoming = serializeMortgageState(remote);
      if (incoming === lastSerialized.current) return;
      lastSerialized.current = incoming;
      setState(remote);
    });
  }, []);

  useEffect(() => {
    const serialized = serializeMortgageState(state);
    if (serialized === lastSerialized.current) return;
    lastSerialized.current = serialized;
    savePersistedMortgageState(state);
  }, [state]);

  // Boot Firestore: anonymous auth → load list → open last / migrate local scenario.
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setCloudStatus("off");
      return;
    }

    let cancelled = false;

    (async () => {
      setCloudStatus("connecting");
      setCloudError(null);
      try {
        const user = await ensureFirebaseUser();
        if (cancelled) return;
        if (!user) {
          cloudReadyRef.current = false;
          setCloudStatus("error");
          setCloudError(
            "Firestore Auth is not ready. In Firebase Console → Authentication → Sign-in method, enable Anonymous, then reload."
          );
          return;
        }

        setUserId(user.uid);
        userIdRef.current = user.uid;

        let { active, archived } = await refreshLists(user.uid);
        if (cancelled) return;

        let activeId = readActivePropertyId();
        // Never open an archived house as the workspace active.
        if (activeId && !active.some((p) => p.id === activeId)) {
          if (archived.some((p) => p.id === activeId)) {
            activeId = null;
          } else {
            activeId = null;
          }
        }

        if (!activeId && active.length > 0) {
          activeId = active[0].id;
        }

        if (!activeId) {
          // First cloud session (or all archived): create next house id (never reuse archived).
          skipNextCloudSave.current = true;
          activeId = await createProperty(user.uid, stateRef.current);
          ({ active, archived } = await refreshLists(user.uid));
        } else {
          const loaded = await getProperty(activeId);
          if (loaded?.scenario) {
            skipNextCloudSave.current = true;
            const serialized = serializeMortgageState(loaded.scenario);
            lastSerialized.current = serialized;
            savePersistedMortgageState(loaded.scenario);
            setState(loaded.scenario);
            void touchLastOpened(activeId);
          }
        }

        writeActivePropertyId(activeId);
        setActivePropertyId(activeId);
        activeIdRef.current = activeId;
        setProperties(active);
        setArchivedProperties(archived);
        cloudReadyRef.current = true;
        setCloudStatus("ready");
        await refreshComparisons(user.uid);
      } catch (err) {
        if (cancelled) return;
        cloudReadyRef.current = false;
        setCloudStatus("error");
        setCloudError(err instanceof Error ? err.message : "Firestore sync failed");
        console.warn("[firestore] boot failed", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshComparisons, refreshLists]);

  // Debounced cloud save of full scenario (all tabs) when fields change.
  useEffect(() => {
    if (!cloudReadyRef.current || cloudStatus !== "ready") return;
    if (!userId || !activePropertyId) return;
    if (skipNextCloudSave.current) {
      skipNextCloudSave.current = false;
      return;
    }

    const handle = window.setTimeout(() => {
      const uid = userIdRef.current;
      const id = activeIdRef.current;
      if (!uid || !id) return;
      void savePropertyScenario(id, uid, stateRef.current, houseRootOptions(id))
        .then(async () => {
          await refreshLists(uid);
          await refreshComparisons(uid);
        })
        .catch((err) => {
          console.warn("[firestore] save failed", err);
          setCloudError(err instanceof Error ? err.message : "Cloud save failed");
        });
    }, CLOUD_SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [state, activePropertyId, userId, cloudStatus, houseRootOptions, refreshComparisons, refreshLists]);

  const patch = useCallback((partial: Partial<AppPersisted>) => {
    setState((prev) => {
      const normalized =
        partial.extraPrincipalMonthly !== undefined
          ? {
              ...partial,
              extraPrincipalMonthly: Math.max(0, Math.round(Number(partial.extraPrincipalMonthly) || 0)),
            }
          : partial;
      const next = { ...prev, ...normalized, v: SCHEMA_VERSION };
      const apr = impliedAnnualAppreciationPercent(
        next.homePrice,
        next.currentHomeValue,
        next.yearsOwned
      );
      return { ...next, sellAnnualAppreciationPercent: apr };
    });
  }, []);

  const reset = useCallback(() => {
    // Clear every tab field to zero / empty (not factory sample defaults).
    const next = emptyAppState();
    lastSerialized.current = serializeMortgageState(next);
    savePersistedMortgageState(next);
    setState(next);
  }, []);

  const replace = useCallback((next: AppPersisted) => {
    const yearsOwned = Math.max(1, Math.round(next.yearsOwned ?? 1));
    const currentHomeValue =
      next.currentHomeValue !== undefined && Number.isFinite(next.currentHomeValue)
        ? Math.max(0, next.currentHomeValue)
        : next.homePrice * (1 + (next.sellAnnualAppreciationPercent ?? 0) / 100) ** yearsOwned;
    const synced: AppPersisted = {
      ...next,
      yearsOwned,
      currentHomeValue,
      v: SCHEMA_VERSION,
      sellAnnualAppreciationPercent: impliedAnnualAppreciationPercent(
        next.homePrice,
        currentHomeValue,
        yearsOwned
      ),
    };
    lastSerialized.current = serializeMortgageState(synced);
    savePersistedMortgageState(synced);
    setState(synced);
  }, []);

  const saveToBrowser = useCallback(() => {
    const serialized = serializeMortgageState(state);
    lastSerialized.current = serialized;
    savePersistedMortgageState(state);
  }, [state]);

  /** Save every tab field for the active house to localStorage + Firestore. */
  const saveToCloud = useCallback(async () => {
    saveToBrowser();
    const uid = userIdRef.current;
    const id = activeIdRef.current;
    if (!uid || !id || !cloudReadyRef.current) return false;
    await savePropertyScenario(id, uid, stateRef.current, houseRootOptions(id));
    await refreshLists(uid);
    await refreshComparisons(uid);
    return true;
  }, [saveToBrowser, houseRootOptions, refreshComparisons, refreshLists]);

  const selectProperty = useCallback(
    async (id: string) => {
      if (!id || id === activeIdRef.current) return;
      const uid = userIdRef.current;

      // Block selecting archived houses into the workspace / compare.
      if (uid) {
        const archived = await listProperties(uid, { archived: true });
        if (archived.some((p) => p.id === id)) {
          console.warn("[firestore] cannot select archived house", id);
          return;
        }
      }

      if (uid && activeIdRef.current && cloudReadyRef.current) {
        try {
          // Flush all tab data for the house we're leaving.
          const leavingId = activeIdRef.current;
          await savePropertyScenario(leavingId, uid, stateRef.current, houseRootOptions(leavingId));
        } catch (err) {
          console.warn("[firestore] flush before switch failed", err);
        }
      }

      const loaded = await getProperty(id);
      if (!loaded?.scenario) return;
      if (loaded.archived) return;

      skipNextCloudSave.current = true;
      replace(loaded.scenario);
      writeActivePropertyId(id);
      setActivePropertyId(id);
      activeIdRef.current = id;
      void touchLastOpened(id);
      if (uid) {
        await refreshLists(uid);
        await refreshComparisons(uid);
      }
    },
    [houseRootOptions, replace, refreshComparisons, refreshLists]
  );

  const createNewProperty = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid || !cloudReadyRef.current) return null;

    if (activeIdRef.current) {
      try {
        const leavingId = activeIdRef.current;
        await savePropertyScenario(leavingId, uid, stateRef.current, houseRootOptions(leavingId));
      } catch {
        /* continue */
      }
    }

    const fresh = defaultMortgageState();
    // nextHouseNumber considers active + archived so IDs are never reused.
    const id = await createProperty(uid, fresh);
    skipNextCloudSave.current = true;
    replace(fresh);
    writeActivePropertyId(id);
    setActivePropertyId(id);
    activeIdRef.current = id;
    await refreshLists(uid);
    await refreshComparisons(uid);
    return id;
  }, [houseRootOptions, replace, refreshComparisons, refreshLists]);

  const archiveHouse = useCallback(
    async (id: string) => {
      const uid = userIdRef.current;
      if (!uid || !cloudReadyRef.current || !id) return false;

      // Flush full scenario first — archive must never wipe tab data.
      if (id === activeIdRef.current) {
        try {
          await savePropertyScenario(id, uid, stateRef.current, houseRootOptions(id));
        } catch (err) {
          console.warn("[firestore] flush before archive failed", err);
        }
      }

      await archiveProperty(id);
      const { active } = await refreshLists(uid);

      if (id === activeIdRef.current) {
        const nextId = active[0]?.id ?? null;
        if (nextId) {
          const loaded = await getProperty(nextId);
          if (loaded?.scenario) {
            skipNextCloudSave.current = true;
            replace(loaded.scenario);
            writeActivePropertyId(nextId);
            setActivePropertyId(nextId);
            activeIdRef.current = nextId;
            void touchLastOpened(nextId);
          }
        } else {
          // No active houses left — create none / show empty local zeros.
          writeActivePropertyId(null);
          setActivePropertyId(null);
          activeIdRef.current = null;
          skipNextCloudSave.current = true;
          replace(emptyAppState());
        }
      }

      await refreshComparisons(uid);
      return true;
    },
    [houseRootOptions, replace, refreshComparisons, refreshLists]
  );

  const restoreHouse = useCallback(
    async (id: string) => {
      const uid = userIdRef.current;
      if (!uid || !cloudReadyRef.current || !id) return false;

      await restoreProperty(id);
      await refreshLists(uid);
      await refreshComparisons(uid);
      return true;
    },
    [refreshComparisons, refreshLists]
  );

  const renameActiveHouse = useCallback(
    async (name: string) => {
      const uid = userIdRef.current;
      const id = activeIdRef.current;
      if (!uid || !id || !cloudReadyRef.current) return null;
      const houseId =
        properties.find((p) => p.id === id)?.houseId ?? formatHouseId(1);
      const next = await renameProperty(id, name, houseId);
      await refreshLists(uid);
      await refreshComparisons(uid);
      return next;
    },
    [properties, refreshComparisons, refreshLists]
  );

  return {
    state,
    patch,
    reset,
    replace,
    saveToBrowser,
    saveToCloud,
    properties,
    archivedProperties,
    comparisons,
    activePropertyId,
    activeHouseNumber,
    activeHouseId,
    activeHouseLabel,
    selectProperty,
    createNewProperty,
    archiveHouse,
    restoreHouse,
    renameActiveHouse,
    cloudStatus,
    cloudError,
  };
}

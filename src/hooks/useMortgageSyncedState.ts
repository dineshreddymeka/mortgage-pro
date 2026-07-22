import { useCallback, useEffect, useRef, useState } from "react";
import { describeAuthUser, subscribeAuthUser, type AuthProfile } from "../collaboration/auth";
import { getEditorSessionId } from "../collaboration/editorSession";
import { acceptAllPendingInvites } from "../collaboration/firestoreMembers";
import type { RevisionConflict, ScenarioCollaborationMeta } from "../collaboration/types";
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
  detectRevisionConflict,
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
  const [properties, setProperties] = useState<PropertyMeta[]>([]);
  const [archivedProperties, setArchivedProperties] = useState<PropertyMeta[]>([]);
  const [activePropertyId, setActivePropertyId] = useState<string | null>(readActivePropertyId);
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>(
    isFirebaseConfigured() ? "connecting" : "off"
  );
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authProfile, setAuthProfile] = useState<AuthProfile | null>(null);
  const [revisionConflict, setRevisionConflict] = useState<RevisionConflict | null>(null);
  const [conflictBusy, setConflictBusy] = useState(false);
  const [comparisonBase, setComparisonBase] = useState<HouseComparisonRow[]>([]);

  const editorSessionId = useRef(getEditorSessionId());
  const localCollaborationRef = useRef<ScenarioCollaborationMeta | null>(null);
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
  const activeAccessRole = activeMeta?.accessRole ?? "owner";
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

  const saveOptions = useCallback(
    (firestoreDocId: string | null, forceOverwrite?: boolean) => ({
      ...houseRootOptions(firestoreDocId),
      editorSessionId: editorSessionId.current,
      expectedRevision: forceOverwrite ? undefined : localCollaborationRef.current?.revision,
      forceOverwrite,
    }),
    [houseRootOptions]
  );

  const applyLoadedProperty = useCallback((loaded: NonNullable<Awaited<ReturnType<typeof getProperty>>>) => {
    localCollaborationRef.current = loaded.collaboration ?? null;
    skipNextCloudSave.current = true;
    const serialized = serializeMortgageState(loaded.scenario);
    lastSerialized.current = serialized;
    savePersistedMortgageState(loaded.scenario);
    setState(loaded.scenario);
  }, []);

  const probeRevisionConflict = useCallback(async (propertyDocId: string) => {
    const loaded = await getProperty(propertyDocId, userIdRef.current ?? undefined);
    if (!loaded) return;
    const conflict = detectRevisionConflict(
      localCollaborationRef.current,
      loaded.collaboration,
      localCollaborationRef.current?.revision
    );
    if (conflict) setRevisionConflict(conflict);
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
      const docs = await listPropertyDocs(uid, { archived: false });
      setComparisonBase(
        docs.map((d) => buildHouseComparisonRow(d.id, d.houseNumber, d.scenario, d.houseId, d.name))
      );
    } catch (err) {
      console.warn("[firestore] comparison refresh failed", err);
    }
  }, []);

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
    if (!hasActive) return [...comparisonBase, live].sort((a, b) => a.houseNumber - b.houseNumber);
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
            "Firestore Auth is not ready. Enable Anonymous (and Google for collaboration) in Firebase Console."
          );
          return;
        }
        setUserId(user.uid);
        userIdRef.current = user.uid;
        setAuthProfile(describeAuthUser(user));
        await acceptAllPendingInvites(user.uid, user.email);

        let { active, archived } = await refreshLists(user.uid);
        if (cancelled) return;

        let activeId = readActivePropertyId();
        if (activeId && !active.some((p) => p.id === activeId)) activeId = null;
        if (!activeId && active.length > 0) activeId = active[0].id;

        if (!activeId) {
          skipNextCloudSave.current = true;
          activeId = await createProperty(user.uid, stateRef.current);
          ({ active, archived } = await refreshLists(user.uid));
        } else {
          const loaded = await getProperty(activeId, user.uid);
          if (loaded?.scenario) {
            applyLoadedProperty(loaded);
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
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyLoadedProperty, refreshComparisons, refreshLists]);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    return subscribeAuthUser((user) => {
      setAuthProfile(user ? describeAuthUser(user) : null);
      if (user) {
        setUserId(user.uid);
        userIdRef.current = user.uid;
      }
    });
  }, []);

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
      void savePropertyScenario(id, uid, stateRef.current, saveOptions(id))
        .then(async (collaboration) => {
          localCollaborationRef.current = collaboration;
          await refreshLists(uid);
          await refreshComparisons(uid);
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : "Cloud save failed";
          if (message.includes("Revision conflict")) void probeRevisionConflict(id);
          setCloudError(message);
        });
    }, CLOUD_SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [state, activePropertyId, userId, cloudStatus, saveOptions, refreshComparisons, refreshLists, probeRevisionConflict]);

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
      return {
        ...next,
        sellAnnualAppreciationPercent: impliedAnnualAppreciationPercent(
          next.homePrice,
          next.currentHomeValue,
          next.yearsOwned
        ),
      };
    });
  }, []);

  const reset = useCallback(() => {
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
    lastSerialized.current = serializeMortgageState(state);
    savePersistedMortgageState(state);
  }, [state]);

  const saveToCloud = useCallback(async () => {
    saveToBrowser();
    const uid = userIdRef.current;
    const id = activeIdRef.current;
    if (!uid || !id || !cloudReadyRef.current) return false;
    const collaboration = await savePropertyScenario(id, uid, stateRef.current, saveOptions(id));
    localCollaborationRef.current = collaboration;
    await refreshLists(uid);
    await refreshComparisons(uid);
    return true;
  }, [saveToBrowser, saveOptions, refreshComparisons, refreshLists]);

  const selectProperty = useCallback(
    async (id: string) => {
      if (!id || id === activeIdRef.current) return;
      const uid = userIdRef.current;
      if (uid) {
        const archived = await listProperties(uid, { archived: true });
        if (archived.some((p) => p.id === id)) return;
      }
      if (uid && activeIdRef.current && cloudReadyRef.current) {
        try {
          await savePropertyScenario(activeIdRef.current, uid, stateRef.current, saveOptions(activeIdRef.current));
        } catch {
          /* continue */
        }
      }
      const loaded = await getProperty(id, uid ?? undefined);
      if (!loaded?.scenario || loaded.archived) return;
      applyLoadedProperty(loaded);
      writeActivePropertyId(id);
      setActivePropertyId(id);
      activeIdRef.current = id;
      void touchLastOpened(id);
      if (uid) {
        await refreshLists(uid);
        await refreshComparisons(uid);
      }
    },
    [applyLoadedProperty, saveOptions, refreshComparisons, refreshLists]
  );

  const createNewProperty = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid || !cloudReadyRef.current) return null;
    if (activeIdRef.current) {
      try {
        await savePropertyScenario(activeIdRef.current, uid, stateRef.current, saveOptions(activeIdRef.current));
      } catch {
        /* continue */
      }
    }
    const fresh = defaultMortgageState();
    const id = await createProperty(uid, fresh);
    localCollaborationRef.current = null;
    skipNextCloudSave.current = true;
    replace(fresh);
    writeActivePropertyId(id);
    setActivePropertyId(id);
    activeIdRef.current = id;
    await refreshLists(uid);
    await refreshComparisons(uid);
    return id;
  }, [replace, saveOptions, refreshComparisons, refreshLists]);

  const archiveHouse = useCallback(
    async (id: string) => {
      const uid = userIdRef.current;
      if (!uid || !cloudReadyRef.current || !id) return false;
      if (propertiesRef.current.find((p) => p.id === id)?.accessRole === "member") return false;
      if (id === activeIdRef.current) {
        try {
          await savePropertyScenario(id, uid, stateRef.current, saveOptions(id));
        } catch {
          /* continue */
        }
      }
      await archiveProperty(id, uid);
      const { active } = await refreshLists(uid);
      if (id === activeIdRef.current) {
        const nextId = active[0]?.id ?? null;
        if (nextId) {
          const loaded = await getProperty(nextId, uid);
          if (loaded?.scenario) {
            applyLoadedProperty(loaded);
            writeActivePropertyId(nextId);
            setActivePropertyId(nextId);
            activeIdRef.current = nextId;
            void touchLastOpened(nextId);
          }
        } else {
          writeActivePropertyId(null);
          setActivePropertyId(null);
          activeIdRef.current = null;
          replace(emptyAppState());
        }
      }
      await refreshComparisons(uid);
      return true;
    },
    [applyLoadedProperty, replace, saveOptions, refreshComparisons, refreshLists]
  );

  const restoreHouse = useCallback(
    async (id: string) => {
      const uid = userIdRef.current;
      if (!uid || !cloudReadyRef.current || !id) return false;
      const meta =
        propertiesRef.current.find((p) => p.id === id) ?? archivedRef.current.find((p) => p.id === id);
      if (meta?.accessRole === "member") return false;
      await restoreProperty(id, uid);
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
      if (!uid || !id || !cloudReadyRef.current || activeAccessRole !== "owner") return null;
      const houseId = properties.find((p) => p.id === id)?.houseId ?? formatHouseId(1);
      const next = await renameProperty(id, name, houseId, uid);
      await refreshLists(uid);
      await refreshComparisons(uid);
      return next;
    },
    [activeAccessRole, properties, refreshComparisons, refreshLists]
  );

  const reloadPortfolio = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid || !cloudReadyRef.current) return;
    await acceptAllPendingInvites(uid, authProfile?.email ?? null);
    await refreshLists(uid);
    await refreshComparisons(uid);
  }, [authProfile?.email, refreshComparisons, refreshLists]);

  const dismissRevisionConflict = useCallback(() => setRevisionConflict(null), []);

  const reloadFromRemote = useCallback(async () => {
    const id = activeIdRef.current;
    const uid = userIdRef.current;
    if (!id || !uid) return;
    setConflictBusy(true);
    try {
      const loaded = await getProperty(id, uid);
      if (loaded?.scenario) applyLoadedProperty(loaded);
      setRevisionConflict(null);
      setCloudError(null);
    } finally {
      setConflictBusy(false);
    }
  }, [applyLoadedProperty]);

  const overwriteRemote = useCallback(async () => {
    const id = activeIdRef.current;
    const uid = userIdRef.current;
    if (!id || !uid) return false;
    setConflictBusy(true);
    try {
      const collaboration = await savePropertyScenario(id, uid, stateRef.current, saveOptions(id, true));
      localCollaborationRef.current = collaboration;
      setRevisionConflict(null);
      setCloudError(null);
      await refreshLists(uid);
      await refreshComparisons(uid);
      return true;
    } finally {
      setConflictBusy(false);
    }
  }, [refreshComparisons, refreshLists, saveOptions]);

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
    userId,
    authProfile,
    activeAccessRole,
    revisionConflict,
    conflictBusy,
    reloadPortfolio,
    dismissRevisionConflict,
    reloadFromRemote,
    overwriteRemote,
  };
}

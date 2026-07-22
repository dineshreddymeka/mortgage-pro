import { useCallback, useEffect, useRef, useState } from "react";
import { impliedAnnualAppreciationPercent } from "../lib/mortgageMath";
import { isFirebaseConfigured } from "../lib/firebase";
import {
  defaultMortgageState,
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
  createProperty,
  defaultPropertyName,
  ensureFirebaseUser,
  getProperty,
  listProperties,
  readActivePropertyId,
  savePropertyScenario,
  touchLastOpened,
  writeActivePropertyId,
  type PropertyMeta,
} from "../storage/firestoreProperties";

const CLOUD_SAVE_DEBOUNCE_MS = 900;

export type CloudSyncStatus = "off" | "connecting" | "ready" | "error";

export function useMortgageSyncedState() {
  const [state, setState] = useState<AppPersisted>(loadPersistedMortgageState);
  const [properties, setProperties] = useState<PropertyMeta[]>([]);
  const [activePropertyId, setActivePropertyId] = useState<string | null>(readActivePropertyId);
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>(
    isFirebaseConfigured() ? "connecting" : "off"
  );
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const lastSerialized = useRef(serializeMortgageState(state));
  const stateRef = useRef(state);
  stateRef.current = state;
  const activeIdRef = useRef(activePropertyId);
  activeIdRef.current = activePropertyId;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const cloudReadyRef = useRef(false);
  const skipNextCloudSave = useRef(false);

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

        let list = await listProperties(user.uid);
        if (cancelled) return;

        let activeId = readActivePropertyId();
        if (activeId && !list.some((p) => p.id === activeId)) {
          activeId = null;
        }

        if (!activeId && list.length > 0) {
          activeId = list[0].id;
        }

        if (!activeId) {
          // First cloud session: upload the current local scenario.
          skipNextCloudSave.current = true;
          activeId = await createProperty(user.uid, stateRef.current);
          list = await listProperties(user.uid);
        } else {
          const doc = await getProperty(activeId);
          if (doc?.scenario) {
            skipNextCloudSave.current = true;
            const serialized = serializeMortgageState(doc.scenario);
            lastSerialized.current = serialized;
            savePersistedMortgageState(doc.scenario);
            setState(doc.scenario);
            void touchLastOpened(activeId);
          }
        }

        writeActivePropertyId(activeId);
        setActivePropertyId(activeId);
        activeIdRef.current = activeId;
        setProperties(list);
        cloudReadyRef.current = true;
        setCloudStatus("ready");
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
  }, []);

  // Debounced cloud save when the active scenario changes.
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
      const scenario = stateRef.current;
      void savePropertyScenario(id, uid, scenario, defaultPropertyName(scenario))
        .then(async () => {
          const list = await listProperties(uid);
          setProperties(list);
        })
        .catch((err) => {
          console.warn("[firestore] save failed", err);
          setCloudError(err instanceof Error ? err.message : "Cloud save failed");
        });
    }, CLOUD_SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [state, activePropertyId, userId, cloudStatus]);

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
    const next = defaultMortgageState();
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

  const saveToCloud = useCallback(async () => {
    saveToBrowser();
    const uid = userIdRef.current;
    const id = activeIdRef.current;
    if (!uid || !id || !cloudReadyRef.current) return false;
    await savePropertyScenario(id, uid, stateRef.current, defaultPropertyName(stateRef.current));
    const list = await listProperties(uid);
    setProperties(list);
    return true;
  }, [saveToBrowser]);

  const selectProperty = useCallback(
    async (id: string) => {
      if (!id || id === activeIdRef.current) return;
      const uid = userIdRef.current;
      if (uid && activeIdRef.current && cloudReadyRef.current) {
        try {
          await savePropertyScenario(
            activeIdRef.current,
            uid,
            stateRef.current,
            defaultPropertyName(stateRef.current)
          );
        } catch (err) {
          console.warn("[firestore] flush before switch failed", err);
        }
      }

      const doc = await getProperty(id);
      if (!doc?.scenario) return;

      skipNextCloudSave.current = true;
      replace(doc.scenario);
      writeActivePropertyId(id);
      setActivePropertyId(id);
      activeIdRef.current = id;
      void touchLastOpened(id);
      if (uid) {
        const list = await listProperties(uid);
        setProperties(list);
      }
    },
    [replace]
  );

  const createNewProperty = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid || !cloudReadyRef.current) return null;

    if (activeIdRef.current) {
      try {
        await savePropertyScenario(
          activeIdRef.current,
          uid,
          stateRef.current,
          defaultPropertyName(stateRef.current)
        );
      } catch {
        /* continue */
      }
    }

    const fresh = defaultMortgageState();
    const id = await createProperty(uid, fresh);
    skipNextCloudSave.current = true;
    replace(fresh);
    writeActivePropertyId(id);
    setActivePropertyId(id);
    activeIdRef.current = id;
    const list = await listProperties(uid);
    setProperties(list);
    return id;
  }, [replace]);

  return {
    state,
    patch,
    reset,
    replace,
    saveToBrowser,
    saveToCloud,
    properties,
    activePropertyId,
    selectProperty,
    createNewProperty,
    cloudStatus,
    cloudError,
  };
}

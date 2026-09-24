/**
 * The signed-in account, and saved gyms.
 *
 * Signed out, saved gyms live on this device only. Signing in merges them
 * into the account, and from then on the server holds the list, so it
 * follows you between the phone and the PC. A copy stays on the device so
 * the list still shows when the server can't be reached.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, OfflineError, type Account } from './api';
import { loadToken, storeToken } from './session';

const SAVED_KEY = 'gymgo.saved.v1';

async function loadLocalSaved(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function storeLocalSaved(ids: string[]) {
  AsyncStorage.setItem(SAVED_KEY, JSON.stringify(ids)).catch(() => undefined);
}

export type AccountState = 'loading' | 'signed_out' | 'signed_in' | 'unreachable';

export function useAccount() {
  const [state, setState] = useState<AccountState>('loading');
  const [account, setAccount] = useState<Account | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const token = useRef<string | null>(null);

  const adopt = useCallback(async (newToken: string, newAccount: Account) => {
    token.current = newToken;
    await storeToken(newToken);
    setAccount(newAccount);
    setState('signed_in');
    // Bring anything saved while signed out into the account.
    const local = await loadLocalSaved();
    const remote = (await api.saved(newToken)).gymIds;
    const missing = local.filter((id) => !remote.includes(id));
    await Promise.all(missing.map((id) => api.save(newToken, id).catch(() => undefined)));
    const merged = [...remote, ...missing];
    setSaved(merged);
    storeLocalSaved(merged);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = await loadLocalSaved();
      if (!cancelled) setSaved(local);
      const stored = await loadToken();
      if (!stored) {
        if (!cancelled) setState('signed_out');
        return;
      }
      try {
        const { account: me } = await api.me(stored);
        if (!cancelled) await adopt(stored, me);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          await storeToken(null);
          setState('signed_out');
        } else {
          // Signed in, but the server is away: keep the token for later.
          token.current = stored;
          setState('unreachable');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adopt]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await api.signIn({ email, password });
      await adopt(result.token, result.account);
    },
    [adopt],
  );

  const signUp = useCallback(
    async (displayName: string, email: string, password: string) => {
      const result = await api.signUp({ displayName, email, password });
      await adopt(result.token, result.account);
    },
    [adopt],
  );

  const signOut = useCallback(async () => {
    const current = token.current;
    token.current = null;
    await storeToken(null);
    setAccount(null);
    setState('signed_out');
    if (current) await api.signOut(current).catch(() => undefined);
  }, []);

  const deleteAccount = useCallback(async () => {
    const current = token.current;
    if (!current) return;
    await api.deleteAccount(current);
    token.current = null;
    await storeToken(null);
    setAccount(null);
    setState('signed_out');
    setSaved([]);
    storeLocalSaved([]);
  }, []);

  const rename = useCallback(async (displayName: string) => {
    const current = token.current;
    if (!current) return;
    const result = await api.rename(current, displayName);
    setAccount(result.account);
  }, []);

  /** Changes the password; any other device signed in as you is signed out. */
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const current = token.current;
    if (!current) return;
    await api.changePassword(current, { currentPassword, newPassword });
  }, []);

  const toggleSave = useCallback((gymId: string) => {
    setSaved((current) => {
      const adding = !current.includes(gymId);
      const next = adding ? [...current, gymId] : current.filter((id) => id !== gymId);
      storeLocalSaved(next);
      const auth = token.current;
      if (auth) {
        (adding ? api.save(auth, gymId) : api.unsave(auth, gymId)).catch((error: unknown) => {
          // Put it back if the server said no; keep it if we're just offline.
          if (!(error instanceof OfflineError)) setSaved((latest) => (adding ? latest.filter((id) => id !== gymId) : [...latest, gymId]));
        });
      }
      return next;
    });
  }, []);

  return {
    state,
    account,
    token: token.current,
    saved,
    signIn,
    signUp,
    signOut,
    deleteAccount,
    rename,
    changePassword,
    toggleSave,
  };
}

export type AccountApi = ReturnType<typeof useAccount>;

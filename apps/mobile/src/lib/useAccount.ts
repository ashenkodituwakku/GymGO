/**
 * The signed-in account, and saved gyms.
 *
 * Signed out, saved gyms live on this device only. Signing in sends the
 * changes made here to the account, and from then on the server holds the
 * list, so it follows you between the phone and the PC. A copy stays on
 * the device so the list still shows when the server can't be reached, and
 * a change made then is sent when it's back (lib/savedGyms.ts).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, OfflineError, type Account, type SignInProvider } from './api';
import { forgetChanges, loadSaved, noteChange, othersWaiting, settleChange, storeSaved, syncSaved } from './savedGyms';
import { loadToken, storeToken } from './session';

export type AccountState = 'loading' | 'signed_out' | 'signed_in' | 'unreachable';

export function useAccount() {
  const [state, setState] = useState<AccountState>('loading');
  const [account, setAccount] = useState<Account | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const savedNow = useRef<string[]>([]);
  const token = useRef<string | null>(null);

  const putSaved = useCallback((ids: string[]) => {
    savedNow.current = ids;
    setSaved(ids);
    storeSaved(ids);
  }, []);

  /** The account's list, after sending it the changes made here. Kept as it is when the server can't be reached. */
  const syncList = useCallback(
    async (auth: string) => {
      try {
        const ids = await syncSaved(auth);
        if (token.current === auth) putSaved(ids);
      } catch {
        // Offline, or the server's having trouble: the copy here stands, and its changes wait.
      }
    },
    [putSaved],
  );

  const adopt = useCallback(
    async (newToken: string, newAccount: Account) => {
      token.current = newToken;
      await storeToken(newToken);
      setAccount(newAccount);
      setState('signed_in');
      await syncList(newToken);
    },
    [syncList],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = await loadSaved();
      if (!cancelled) {
        savedNow.current = local;
        setSaved(local);
      }
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
    async (displayName: string, email: string, password: string, birthMonth: string) => {
      const result = await api.signUp({ displayName, email, password, birthMonth });
      await adopt(result.token, result.account);
    },
    [adopt],
  );

  /** Signs in with a Google or Apple ID token; the first time, that makes the account. Returns whether it was new. */
  const signInWith = useCallback(
    async (provider: SignInProvider, idToken: string, nonce: string | null, name?: string | null, birthMonth?: string) => {
      // The answer to the age question, when a new account is being made (see ageGate.ts).
      const result = await api.signInWith(provider, { idToken, nonce, name, ...(birthMonth ? { birthMonth } : {}) });
      await adopt(result.token, result.account);
      return result.created;
    },
    [adopt],
  );

  /**
   * Signed in, but the server was away: try again (it's back, or the phone
   * is on the right Wi-Fi now). A 401 means the sign-in has ended meanwhile.
   */
  const reconnect = useCallback(async () => {
    const stored = token.current;
    if (!stored) return;
    try {
      const { account: me } = await api.me(stored);
      await adopt(stored, me);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        token.current = null;
        await storeToken(null);
        setAccount(null);
        setState('signed_out');
      }
    }
  }, [adopt]);

  const refreshAccount = useCallback(async () => {
    const current = token.current;
    if (!current) return;
    const { account: me } = await api.me(current);
    setAccount(me);
  }, []);

  const signOut = useCallback(async () => {
    const current = token.current;
    token.current = null;
    forgetChanges();
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
    forgetChanges();
    await storeToken(null);
    setAccount(null);
    setState('signed_out');
    putSaved([]);
  }, [putSaved]);

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

  const toggleSave = useCallback(
    (gymId: string) => {
      const adding = !savedNow.current.includes(gymId);
      putSaved(adding ? [...savedNow.current, gymId] : savedNow.current.filter((id) => id !== gymId));
      const version = noteChange(gymId, adding ? 'save' : 'unsave');
      const auth = token.current;
      if (!auth) return;
      (adding ? api.save(auth, gymId) : api.unsave(auth, gymId)).then(
        () => {
          settleChange(gymId, version);
          // The server's there: send anything else that waited for it.
          if (othersWaiting(gymId)) void syncList(auth);
        },
        (error: unknown) => {
          // Offline: it waits, and goes when the server's back. Refused: put it back.
          if (error instanceof OfflineError) return;
          if (settleChange(gymId, version)) putSaved(adding ? savedNow.current.filter((id) => id !== gymId) : [...savedNow.current, gymId]);
        },
      );
    },
    [putSaved, syncList],
  );

  return {
    state,
    account,
    /** Set while signed in, and still while the server is away ('unreachable'): you haven't been signed out. */
    token: token.current,
    saved,
    signIn,
    signUp,
    signInWith,
    reconnect,
    refreshAccount,
    signOut,
    deleteAccount,
    rename,
    changePassword,
    toggleSave,
  };
}

export type AccountApi = ReturnType<typeof useAccount>;

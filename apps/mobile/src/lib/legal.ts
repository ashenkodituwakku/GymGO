/**
 * Who runs GymGO, as the server says (named in the terms and privacy
 * policy), and its copyright agent. Asked for once and shared; until the
 * server answers, or if it can't be reached, the documents name "the GymGO
 * team" and point to Report a bug.
 */

import { useEffect, useState } from 'react';
import { DEFAULT_OPERATOR, type LegalOperator } from '@gymgo/domain';
import { api } from './api';

export interface LegalInfo {
  operator: LegalOperator;
  copyrightAgent: { name: string; address: string | null; email: string | null } | null;
  /** False until the server has answered (or failed to). */
  ready: boolean;
}

let known: LegalInfo | null = null;
let asking: Promise<LegalInfo> | null = null;

function ask(): Promise<LegalInfo> {
  asking ??= api
    .legal()
    .then((answer) => (known = { operator: answer.operator ?? DEFAULT_OPERATOR, copyrightAgent: answer.copyrightAgent, ready: true }))
    .catch(() => {
      // Asked again next time a document opens: the server may be back.
      asking = null;
      return { operator: DEFAULT_OPERATOR, copyrightAgent: null, ready: true };
    });
  return asking;
}

export function useLegalInfo(): LegalInfo {
  const [info, setInfo] = useState<LegalInfo>(known ?? { operator: DEFAULT_OPERATOR, copyrightAgent: null, ready: false });
  useEffect(() => {
    if (known) return;
    let live = true;
    void ask().then((answer) => live && setInfo(answer));
    return () => {
      live = false;
    };
  }, []);
  return info;
}

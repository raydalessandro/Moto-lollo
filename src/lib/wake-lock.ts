"use client";

import { useEffect, useState } from "react";

/**
 * `useWakeLock(active)` — quando `active` è true, prova a tenere acceso lo
 * schermo via Wake Lock API. Stato ritornato dice se è effettivamente
 * attivo, se la API è supportata, e l'eventuale errore.
 *
 * Note importanti:
 * - L'utente DEVE aver interagito con la pagina prima (gesture activation).
 *   Quindi chiamare al mount di un overlay tracking è OK perché parte da
 *   un tap utente.
 * - Su iOS PWA installata, supportato da iOS 16.4+. Su Safari Web (no
 *   install), NON supportato. Su Chrome Android funziona.
 * - Il lock si rilascia automaticamente quando il documento va background
 *   (tab switch / app minimized). Va ri-acquisito quando torna foreground.
 */
export function useWakeLock(active: boolean) {
  const [state, setState] = useState<{
    supported: boolean;
    active: boolean;
    error: Error | null;
  }>({
    supported: false,
    active: false,
    error: null,
  });

  useEffect(() => {
    const supported =
      typeof navigator !== "undefined" && "wakeLock" in navigator;

    setState((s) => ({ ...s, supported }));

    if (!active || !supported) {
      setState((s) => ({ ...s, active: false }));
      return;
    }

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          sentinel.release().catch(() => {});
          return;
        }
        setState({ supported: true, active: true, error: null });
        sentinel.addEventListener("release", () => {
          setState((s) => ({ ...s, active: false }));
        });
      } catch (err) {
        setState({
          supported: true,
          active: false,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }
    };

    // Re-acquire wake lock when the document becomes visible again.
    const onVisibility = () => {
      if (document.visibilityState === "visible" && sentinel?.released !== false) {
        acquire();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    acquire();

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (sentinel) sentinel.release().catch(() => {});
      setState((s) => ({ ...s, active: false }));
    };
  }, [active]);

  return state;
}

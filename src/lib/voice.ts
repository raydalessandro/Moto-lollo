/**
 * Voice prompt layer per turn-by-turn navigation.
 *
 * **Now**: Web Speech API (`speechSynthesis`) — voce di sistema, italiano.
 *
 * **Future** (post-MVP): swap a player di clip audio registrate.
 * Bastera' riscrivere `speak()` per riprodurre l'mp3 corrispondente al
 * `cueKey` (es. "tra-200m-svolta-destra.mp3"). Tutte le call-site usano
 * la stessa API, niente refactor a cascata.
 */

let synthCache: SpeechSynthesis | null = null;

function getSynth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  if (synthCache) return synthCache;
  synthCache = window.speechSynthesis ?? null;
  return synthCache;
}

export function isVoiceAvailable(): boolean {
  return getSynth() !== null;
}

/**
 * Parla immediatamente. Cancella eventuali utterance in coda per evitare
 * sovrapposizione quando il GPS sputa fix rapidi durante le svolte.
 *
 * cueKey è opzionale ora ma riservato per il futuro player di clip
 * registrate: la stessa key mappata su file mp3.
 */
export function speak(text: string, _cueKey?: string): void {
  const s = getSynth();
  if (!s) return;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "it-IT";
  u.rate = 1.0;
  u.pitch = 1.0;
  u.volume = 1.0;
  s.speak(u);
}

export function cancelSpeech(): void {
  getSynth()?.cancel();
}

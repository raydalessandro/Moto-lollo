import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Voice layer mockato. SpeechSynthesis non esiste in node/jsdom di base,
 * quindi mockiamo globalThis.window con un'API minima e verifichiamo che
 * `speak()` e `cancelSpeech()` chiamino i metodi giusti.
 *
 * Usiamo resetModules tra test per pulire la cache interna del modulo.
 */
describe("voice", () => {
  beforeEach(() => {
    vi.resetModules();
    // Cleanup eventuale window stub residuo
    // @ts-expect-error: test stub
    delete globalThis.window;
  });

  it("isVoiceAvailable ritorna false se window non esiste", async () => {
    const mod = await import("../voice");
    expect(mod.isVoiceAvailable()).toBe(false);
  });

  it("isVoiceAvailable ritorna false se window esiste ma senza speechSynthesis", async () => {
    // @ts-expect-error: test stub
    globalThis.window = {};
    const mod = await import("../voice");
    expect(mod.isVoiceAvailable()).toBe(false);
  });

  it("isVoiceAvailable ritorna true se speechSynthesis è presente", async () => {
    // @ts-expect-error: test stub
    globalThis.window = { speechSynthesis: { speak: vi.fn(), cancel: vi.fn() } };
    // @ts-expect-error: test stub - need SpeechSynthesisUtterance constructor
    globalThis.SpeechSynthesisUtterance = class {
      text: string;
      lang = "";
      rate = 1;
      pitch = 1;
      volume = 1;
      constructor(text: string) {
        this.text = text;
      }
    };
    const mod = await import("../voice");
    expect(mod.isVoiceAvailable()).toBe(true);
  });

  it("speak() chiama cancel + speak con lang it-IT", async () => {
    const cancelMock = vi.fn();
    const speakMock = vi.fn();
    // @ts-expect-error: test stub
    globalThis.window = {
      speechSynthesis: { cancel: cancelMock, speak: speakMock },
    };
    // @ts-expect-error: test stub
    globalThis.SpeechSynthesisUtterance = class {
      text: string;
      lang = "";
      rate = 1;
      pitch = 1;
      volume = 1;
      constructor(text: string) {
        this.text = text;
      }
    };
    const mod = await import("../voice");
    mod.speak("ciao");
    expect(cancelMock).toHaveBeenCalledOnce();
    expect(speakMock).toHaveBeenCalledOnce();
    const utterance = speakMock.mock.calls[0][0];
    expect(utterance.text).toBe("ciao");
    expect(utterance.lang).toBe("it-IT");
  });

  it("speak() è no-op se synth non disponibile", async () => {
    const mod = await import("../voice");
    // Non dovrebbe lanciare
    expect(() => mod.speak("test")).not.toThrow();
  });

  it("cancelSpeech() chiama cancel quando disponibile", async () => {
    const cancelMock = vi.fn();
    // @ts-expect-error: test stub
    globalThis.window = { speechSynthesis: { cancel: cancelMock, speak: vi.fn() } };
    const mod = await import("../voice");
    mod.cancelSpeech();
    expect(cancelMock).toHaveBeenCalledOnce();
  });

  it("cancelSpeech() è no-op se synth non disponibile", async () => {
    const mod = await import("../voice");
    expect(() => mod.cancelSpeech()).not.toThrow();
  });
});

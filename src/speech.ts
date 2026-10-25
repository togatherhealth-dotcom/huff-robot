// Huff's voice: the browser's built-in speech synthesis.
// Run every session on the same laptop and browser so everyone hears the same voice.

const PREFERRED = ["Daniel", "Google UK English Male", "Samantha", "Google US English", "Microsoft Ryan", "Alex"];
export const RATE = 0.98;
export const PITCH = 1.15;

export function englishVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
}

export function defaultVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  for (const name of PREFERRED) {
    const v = voices.find((x) => x.name.includes(name));
    if (v) return v;
  }
  return voices[0];
}

/** Waits until the browser has loaded its voice list (it loads asynchronously). */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) return resolve([]);
    const now = englishVoices();
    if (now.length) return resolve(now);
    const done = () => resolve(englishVoices());
    window.speechSynthesis.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 1500);
  });
}

/**
 * Speaks a line and resolves when it has finished.
 * If speech is unavailable or muted, waits for a reading-time estimate instead,
 * so the pace of the conversation stays similar.
 */
export function speak(text: string, voiceName: string | null, muted: boolean, onStart?: () => void): Promise<void> {
  const estimate = Math.max(1400, text.split(/\s+/).length * 330);
  if (muted || !("speechSynthesis" in window)) {
    onStart?.();
    return new Promise((r) => setTimeout(r, estimate));
  }
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = englishVoices().find((x) => x.name === voiceName);
    if (v) u.voice = v;
    u.lang = v?.lang ?? "en-GB";
    u.rate = RATE;
    u.pitch = PITCH;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      resolve();
    };
    u.onstart = () => onStart?.();
    u.onend = finish;
    u.onerror = finish;
    // Safety net: some browsers occasionally never fire "end".
    setTimeout(finish, estimate * 2.5 + 2000);
    synth.speak(u);
  });
}

export function stopSpeaking() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

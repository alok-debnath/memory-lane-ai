import { useCallback, useRef, useState } from 'react';

export function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const getSynth = () => {
    if (typeof window === 'undefined') return null;
    return window.speechSynthesis ?? null;
  };

  const speak = useCallback((text: string) => {
    const synth = getSynth();
    if (!synth) return;

    // Cancel any ongoing speech
    synth.cancel();

    // Strip markdown formatting for cleaner speech
    const clean = text
      .replace(/[#*_~`>]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n+/g, '. ')
      .replace(/⚠️/g, 'Warning: ')
      .trim();

    const utt = new SpeechSynthesisUtterance(clean);
    utt.rate = 1.0;
    utt.pitch = 1.0;

    // Try to pick a natural-sounding voice
    const voices = synth.getVoices();
    const preferred = voices.find(
      (v) => v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Natural')
    );
    if (preferred) utt.voice = preferred;

    utt.onstart = () => setSpeaking(true);
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);

    utteranceRef.current = utt;
    synth.speak(utt);
  }, []);

  const stop = useCallback(() => {
    const synth = getSynth();
    if (!synth) {
      setSpeaking(false);
      return;
    }
    synth.cancel();
    setSpeaking(false);
  }, []);

  return { speak, stop, speaking };
}

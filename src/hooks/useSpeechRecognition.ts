import { useEffect, useRef, useState } from "react";

interface SpeechHook {
  supported: boolean;
  listening: boolean;
  transcript: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeechRecognition(lang: string = "en-US"): SpeechHook {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }
    setSupported(true);
    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = (e: any) => setError(e.error || "speech error");
    recognition.onresult = (event: any) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        text += res[0].transcript;
      }
      setTranscript(text);
    };

    recognitionRef.current = recognition;
    return () => {
      try { recognition.stop(); } catch { /* no-op */ }
    };
  }, [lang]);

  const start = () => {
    setError(null);
    try { recognitionRef.current?.start(); } catch (e) { /* ignore */ }
  };
  const stop = () => {
    try { recognitionRef.current?.stop(); } catch (e) { /* ignore */ }
  };
  const reset = () => setTranscript("");

  return { supported, listening, transcript, error, start, stop, reset };
}

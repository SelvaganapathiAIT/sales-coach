import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

interface VoiceCoachHookReturn {
  status: ConnectionStatus;
  isSpeaking: boolean;
  startSession: () => Promise<void>;
  endSession: () => void;
  setVolume: (volume: number) => void;
}

export const useVoiceCoach = (
  onConnect?: () => void,
  onDisconnect?: () => void,
  onMessage?: (message: any) => void,
  onError?: (error: any) => void
): VoiceCoachHookReturn => {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<Uint8Array[]>([]);
  const isPlayingRef = useRef(false);

  const startSession = useCallback(async () => {
    try {
      setStatus('connecting');
      
      // Get current user session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      // Get microphone permission - use 16kHz to match ElevenLabs
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      mediaStreamRef.current = stream;

      // Create audio context - use 16kHz to match ElevenLabs
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/^https?:\/\//, "wss://");
      // Connect to ElevenLabs via our edge function with authentication
      let wsUrl = `${supabaseUrl}/functions/v1/elevenlabs-websocket`;

      // Add auth token as query parameter if user is authenticated
      if (session?.access_token) {
        wsUrl += `?token=${encodeURIComponent(session.access_token)}`;
      }
      // Get saved coach settings from localStorage
        const savedSettings = localStorage.getItem('coachSettings');
        let coachConfig = null;
        
        if (savedSettings) {
          try {
            coachConfig = JSON.parse(savedSettings);
            console.log('Using saved coach settings:', coachConfig);
          } catch (error) {
            console.error('Error parsing saved coach settings:', error);
          }
        }

      wsUrl += `&coachId=${encodeURIComponent(coachConfig?.coachId)}`;
      console.log('Connecting to ElevenLabs via:', wsUrl);
      console.log('User session:', session?.user?.id ? `Authenticated (${session.user.id})` : 'Anonymous');
      
      // // Update agent instructions with user context before connecting
      // if (session?.user?.id) {
      //   console.log('Updating agent instructions with user context...');
        
        
        
      //   try {
      //     const { data, error } = await supabase.functions.invoke('update-agent-instructions', {
      //       body: {
      //         userId: session.user.id,
      //         // Include coach settings if available
      //         ...(coachConfig && {
      //           customInstructions: coachConfig.customInstructions,
      //           firstMessage: coachConfig.firstMessage,
      //           coachName: coachConfig.coachName,
      //           coachingStyle: coachConfig.coachingStyle,
      //           roastingLevel: coachConfig.roastingLevel,
      //           voiceId: coachConfig.voiceId
      //         })
      //       }
      //     });
          
      //     if (error) {
      //       console.error('Error updating agent instructions:', error);
      //     } else {
      //       console.log('Agent instructions updated successfully');
      //     }
      //   } catch (error) {
      //     console.error('Failed to update agent instructions:', error);
      //   }
      // }
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setStatus('connected');
        onConnect?.();
        
        // Start sending audio data
        startAudioStreaming(stream);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received message type:', data.type);
          
          if (data.type === 'connected') {
            setStatus('connected');
            onConnect?.();
          } else if (data.type === 'disconnected') {
            setStatus('disconnected');
            onDisconnect?.();
          } else if (data.type === 'error') {
            onError?.(new Error(data.message));
          } else if (data.type === 'audio') {
            // Handle audio data from ElevenLabs
            console.log('Received audio from ElevenLabs');
            setIsSpeaking(true);
            
            if (data.audio_event && data.audio_event.audio_base_64) {
              const audioData = data.audio_event.audio_base_64;
              // Convert base64 to Uint8Array and add to queue
              const binaryString = atob(audioData);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              playAudioData(bytes); // Use queue system
            }
          } else if (data.type === 'user_transcript') {
            console.log('User transcript:', data.user_transcription_event?.user_transcript);
            onMessage?.(data);
          } else if (data.type === 'agent_response') {
            console.log('Agent response:', data.agent_response_event?.agent_response);
            onMessage?.(data);
          } else if (data.type === 'ping') {
            if (data.ping_event?.event_id) {
              wsRef.current?.send(JSON.stringify({
                type: 'pong',
                event_id: data.ping_event.event_id
              }));
            }
          } else if (data.audio_event) {
            // ElevenLabs audio format
            console.log('Received ElevenLabs audio event');
            
            if (data.audio_event.audio_base_64) {
              // Convert base64 to Uint8Array and add to queue
              const binaryString = atob(data.audio_event.audio_base_64);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              playAudioData(bytes); // Use queue system
            }
          } else {
            onMessage?.(data);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
          // Try to handle as binary audio data
          if (event.data instanceof ArrayBuffer) {
            console.log('Received binary audio data (fallback)');
            setIsSpeaking(true);
            playAudioData(new Uint8Array(event.data));
          }
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('disconnected');
        onError?.(error);
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setStatus('disconnected');
        onDisconnect?.();
      };

    } catch (error) {
      console.error('Error starting session:', error);
      setStatus('disconnected');
      onError?.(error);
    }
  }, [onConnect, onDisconnect, onMessage, onError]);

  const startAudioStreaming = useCallback((stream: MediaStream) => {
    if (!audioContextRef.current || !wsRef.current) return;

    const source = audioContextRef.current.createMediaStreamSource(stream);
    const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

    source.connect(processor);
    processor.connect(audioContextRef.current.destination);

    processor.onaudioprocess = (event) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        // Convert float32 to PCM16
        const int16Array = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Send raw PCM16 binary data directly to WebSocket
        wsRef.current.send(int16Array.buffer);
      }
    };
  }, []);

  // Audio queue for sequential playback - this ensures no audio overlap
  const playAudioData = useCallback(async (audioData: Uint8Array) => {
    console.log('Adding audio to queue, current queue size:', audioQueueRef.current.length);
    audioQueueRef.current.push(audioData);
    if (!isPlayingRef.current) {
      console.log('Starting audio playback from queue');
      await playNext();
    }
  }, []);

  const playNext = useCallback(async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsSpeaking(false); // Stop speaking when queue is empty
      return;
    }

    isPlayingRef.current = true;
    setIsSpeaking(true); // Set speaking when starting playback
    const audioData = audioQueueRef.current.shift()!;

    try {
      if (!audioContextRef.current) return;
      
      console.log('Playing audio chunk, size:', audioData.length);
      
      // Create WAV from PCM data
      const wavData = createWavFromPCM(audioData);
      const audioBuffer = await audioContextRef.current.decodeAudioData(wavData.buffer);
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        console.log('Audio chunk finished, playing next...');
        playNext();
      };
      
      source.start(0);
      console.log('Audio chunk playback started');
    } catch (error) {
      console.error('Error playing audio:', error);
      playNext(); // Continue with next segment even if current fails
    }
  }, []);

  const createWavFromPCM = useCallback((pcmData: Uint8Array) => {
    // Convert bytes to 16-bit samples
    const int16Data = new Int16Array(pcmData.length / 2);
    for (let i = 0; i < pcmData.length; i += 2) {
      int16Data[i / 2] = (pcmData[i + 1] << 8) | pcmData[i];
    }
    
    // Create WAV header
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);
    
    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    // WAV header parameters - Use 16000 Hz to match ElevenLabs
    const sampleRate = 16000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;

    // Write WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + int16Data.byteLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, 'data');
    view.setUint32(40, int16Data.byteLength, true);

    // Combine header and data
    const wavArray = new Uint8Array(wavHeader.byteLength + int16Data.byteLength);
    wavArray.set(new Uint8Array(wavHeader), 0);
    wavArray.set(new Uint8Array(int16Data.buffer), wavHeader.byteLength);
    
    return wavArray;
  }, []);

  const endSession = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setStatus('disconnected');
    setIsSpeaking(false);
    
    // Clear audio queue
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  const setVolume = useCallback((volume: number) => {
    // Volume control can be implemented here if needed
    console.log('Setting volume to:', volume);
  }, []);

  return {
    status,
    isSpeaking,
    startSession,
    endSession,
    setVolume,
  };
};
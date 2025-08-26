// RealtimeAudio.ts
// WebSocket mic streaming + playback for ElevenLabs ConvAI

export type OnMessage = (msg: any) => void;
export type OnError = (err: any) => void;
export type OnConnect = () => void;
export type OnDisconnect = (ev?: CloseEvent) => void;

export interface RealtimeChatOptions {
  coachId: string;
  voiceId?: string;
  signedUrlEndpoint?: string;

  // Audio capture
  sampleRate?: 16000 | 24000;
  chunkMs?: number;

  // Event hooks
  onMessage?: OnMessage;
  onError?: OnError;
  onConnect?: OnConnect;
  onDisconnect?: OnDisconnect;
}

export class RealtimeChat {
  private ws?: WebSocket;
  private opts: Required<RealtimeChatOptions>;
  private recorder?: AudioRecorder;
  private audioPlayer: PcmPlayer;
  private destroyed = false;
  private userInputFormat: "pcm_16000" | "pcm_24000" = "pcm_16000";
  private agentOutputFormat: "pcm_16000" | "pcm_24000" = "pcm_16000";

  constructor(options: RealtimeChatOptions) {
    const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").replace(/^https?:\/\//, "wss://");

    this.opts = {
      signedUrlEndpoint: `${supabaseUrl}/functions/v1/elevenlabs-w  ebsocket`,
      chunkMs: 60,
      sampleRate: 16000,
      onMessage: () => {},
      onError: () => {},
      onConnect: () => {},
      onDisconnect: () => {},
      ...options,
    } as Required<RealtimeChatOptions>;

    this.userInputFormat = this.opts.sampleRate === 24000 ? "pcm_24000" : "pcm_16000";
    this.audioPlayer = new PcmPlayer();
  }

  async start(): Promise<void> {
    await this.connect();
    await this.startRecording();
  }

  async connect() {
    if (this.ws) return;

    const url = `${this.opts.signedUrlEndpoint}&coachId=${this.opts.coachId}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.opts.onConnect?.();
      this.send({ type: "connected" });
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleServerEvent(msg);
      } catch (e) {
        console.error('Invalid WebSocket message:', event.data);
      }
    };

    this.ws.onclose = (event) => {
      this.opts.onDisconnect?.(event);
      this.ws = undefined;
    };

    this.ws.onerror = (err) => {
      this.opts.onError?.(err);
    };
  }

  private handleServerEvent(evt: any) {

    switch (evt.type) {
      case "conversation_initiation_metadata": {
        const outFmt = evt?.conversation_initiation_metadata_event?.agent_output_audio_format;
        const inFmt = evt?.conversation_initiation_metadata_event?.user_input_audio_format;
        if (outFmt) this.agentOutputFormat = outFmt;
        if (inFmt) this.userInputFormat = inFmt;
        break;
      }

      case "audio": {
        const b64 = evt?.audio_event?.audio_base_64;
        if (b64) {
          const binaryString = atob(b64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
          this.playAudioData(bytes);
          
          // Notify that agent is speaking
          if (this.opts.onMessage) {
            this.opts.onMessage({ type: "audio_start" });
          }
        }
        break;
      }

      case "agent_response": {
        const response = evt?.agent_response_event?.agent_response || evt?.response || evt?.text;
        console.log('🤖 Agent response found:', response);
        if (response && this.opts.onMessage) {
          this.opts.onMessage({
            type: "agent_response",
            response: response,
          });
        }
        break;
      }

      case "user_transcript":
      case "user_transcription": {
        // Handle multiple possible transcript locations
        let transcript = null;
        
        // Try different possible paths for the transcript
        if (evt?.user_transcription_event?.transcript) {
          transcript = evt.user_transcription_event.transcript;
        } else if (evt?.transcript) {
          transcript = evt.transcript;
        } else if (evt?.text) {
          transcript = evt.text;
        } else if (evt?.user_transcript) {
          transcript = evt.user_transcript;
        }

        transcript = transcript?.trim();
        console.log('User transcript found:', transcript);
        console.log('User transcript found:', evt);

        if (transcript && this.opts.onMessage) {
          this.opts.onMessage({ 
            type: "user_transcript", 
            transcript: transcript 
          });
        }
        break;
      }

      // Handle other possible user input events
      case "user_message":
      case "user_input":
      case "speech_recognition": {
        const transcript = evt?.text || evt?.message || evt?.transcript || evt?.content;
        if (transcript?.trim() && this.opts.onMessage) {
          this.opts.onMessage({ 
            type: "user_transcript", 
            transcript: transcript.trim() 
          });
        }
        break;
      }

      // Handle audio status events
      case "audio_start":
      case "speaking_start": {
        if (this.opts.onMessage) {
          this.opts.onMessage({ type: "audio_start" });
        }
        break;
      }

      case "audio_end":
      case "audio_done":
      case "speaking_stop": {
        if (this.opts.onMessage) {
          this.opts.onMessage({ type: "audio_done" });
        }
        break;
      }

      // Handle recording status events
      case "recording_start":
      case "listening_start":
      case "user_speaking_started": {
        if (this.opts.onMessage) {
          this.opts.onMessage({ type: "recording_start" });
        }
        break;
      }

      case "recording_stop":
      case "listening_stop":
      case "user_speaking_stopped": {
        if (this.opts.onMessage) {
          this.opts.onMessage({ type: "recording_stop" });
        }
        break;
      }

      default:
        // Log unhandled events to help debug
        console.log('Unhandled server event:', evt.type, evt);
        
        // Check if this unknown event contains user transcript data
        const possibleTranscript = evt?.transcript || evt?.text || evt?.message || evt?.content;
        if (possibleTranscript?.trim()) {
          console.log('Unknown event contains text content:', possibleTranscript);

          // If it looks like user input, forward it anyway
          if (this.opts.onMessage) {
            this.opts.onMessage({ 
              type: "user_transcript", 
              transcript: possibleTranscript.trim() 
            });
          }
        }
        
        // Forward all events to the message handler for debugging
        if (this.opts.onMessage) {
          this.opts.onMessage(evt);
        }
        break;
    }
  }

  private async playAudioData(audioData: Uint8Array) {
    const pcm16 = new Int16Array(audioData.buffer, audioData.byteOffset, audioData.byteLength / 2);
    const sampleRate = this.agentOutputFormat === "pcm_24000" ? 24000 : 16000;
    this.audioPlayer.enqueue(pcm16, sampleRate);
  }

  send(obj: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not ready, cannot send:', obj);
      return;
    }
    try {
      console.log('Sending to WebSocket:', obj);
      this.ws.send(JSON.stringify(obj));
    } catch (e) {
      console.error('Error sending WebSocket message:', e);
      this.opts.onError?.(e);
    }
  }

  sendText(text: string) {
    if (!text?.trim()) return;
    console.log('Sending text message:', text);
    this.send({ type: "user_message", text: text.trim() });
    this.send({ type: "user_activity" });
  }

  async startRecording(): Promise<void> {
    if (this.recorder) {
      console.log('Recording already active');
      return;
    }

    console.log('Starting audio recording...');
    this.recorder = new AudioRecorder({
      targetSampleRate: this.opts.sampleRate,
      chunkMs: this.opts.chunkMs,
      onChunk: (b16) => {
        const b64 = int16ToBase64(b16);
        this.send({ user_audio_chunk: b64 });
      },
      onError: (e) => {
        console.error(' Recording error:', e);
        this.opts.onError?.(e);
      },
    });
    
    try {
      await this.recorder.start();      
      // Notify that recording started
      if (this.opts.onMessage) {
        this.opts.onMessage({ type: "recording_start" });
      }
    } catch (e) {
      console.error('Failed to start recording:', e);
      this.recorder = undefined;
      throw e;
    }
  }

  async stopRecording(): Promise<void> {
    if (!this.recorder) return;
    
    console.log('Stopping audio recording...');
    await this.recorder.stop();
    this.recorder = undefined;
    
    // Notify that recording stopped
    if (this.opts.onMessage) {
      this.opts.onMessage({ type: "recording_stop" });
    }
    console.log('Audio recording stopped');
  }

  async disconnect(): Promise<void> {
    await this.destroy();
  }

  async destroy(): Promise<void> {
    if (this.destroyed) return;
    this.destroyed = true;
    
    await this.stopRecording();
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.close();
      } catch (e) {
        console.log('WebSocket close error (ignored):', e);
      }
    }
    this.ws = undefined;
    this.audioPlayer.reset();
  }
}

// ---------- Audio Recorder ----------

class AudioRecorder {
  private stream?: MediaStream;
  private ctx?: AudioContext;
  private workletNode?: AudioWorkletNode;
  private source?: MediaStreamAudioSourceNode;
  private targetRate: number;
  private chunkMs: number;
  private onChunk: (pcm16: Int16Array) => void;
  private onError: (e: any) => void;

  constructor(opts: { targetSampleRate: number; chunkMs: number; onChunk: (pcm16: Int16Array) => void; onError: (e: any) => void }) {
    this.targetRate = opts.targetSampleRate;
    this.chunkMs = Math.max(20, Math.min(120, opts.chunkMs));
    this.onChunk = opts.onChunk;
    this.onError = opts.onError;
  }

  async start(): Promise<void> {
    try {
      console.log('Requesting microphone access...');
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true, 
          autoGainControl: true 
        }, 
        video: false 
      });
      
      console.log('Creating audio context...');
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.source = this.ctx.createMediaStreamSource(this.stream);

      await this.ctx.audioWorklet.addModule("/audio-processor.js");
      this.workletNode = new AudioWorkletNode(this.ctx, "audio-processor");

      this.workletNode.port.onmessage = (event) => {
        const pcm16 = new Int16Array(event.data);
        this.onChunk(pcm16);
      };

      this.source.connect(this.workletNode);
      this.workletNode.connect(this.ctx.destination);
      console.log('Audio recording setup complete');
    } catch (e) {
      console.error('Audio recording setup failed:', e);
      this.onError(e);
      throw e;
    }
  }

  async stop(): Promise<void> {
    try {
      this.workletNode?.disconnect();
      this.source?.disconnect();
      if (this.ctx?.state !== "closed") await this.ctx?.close();
      this.stream?.getTracks().forEach((t) => t.stop());
    } catch (e) {
      console.log('Audio recorder stop error (ignored):', e);
    }
    this.workletNode = undefined;
    this.source = undefined;
    this.ctx = undefined;
    this.stream = undefined;
  }
}

// ---------- PCM Player ----------

class PcmPlayer {
  public ctx: AudioContext;
  private queueTime = 0;

  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  enqueue(pcm16: Int16Array, sampleRate: number) {
    const frames = pcm16.length;
    const buf = this.ctx.createBuffer(1, frames, sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) ch[i] = pcm16[i] / 0x8000;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const startAt = Math.max(this.ctx.currentTime + 0.02, this.queueTime);
    src.connect(this.ctx.destination);
    src.start(startAt);

    this.queueTime = startAt + buf.duration;
  }

  reset() {
    try {
      this.ctx.close();
    } catch {}
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.queueTime = 0;
  }
}

// ---------- utils ----------

function int16ToBase64(data: Int16Array): string {
  let bin = "";
  const bytes = new Uint8Array(data.buffer);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
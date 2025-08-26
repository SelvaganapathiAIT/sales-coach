// Audio Worklet Processor for real-time microphone capture
// This handles microphone input, resampling, and chunking for ElevenLabs

class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 1024; // Process in chunks
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    this.targetSampleRate = 16000; // ElevenLabs expects 16kHz
    this.inputSampleRate = sampleRate; // Current context sample rate
    this.resampleRatio = this.inputSampleRate / this.targetSampleRate;
    this.resampleBuffer = [];
    this.resampleIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    if (input.length > 0) {
      const inputChannel = input[0]; // Use first channel (mono)
      
      // Process each sample
      for (let i = 0; i < inputChannel.length; i++) {
        // Simple resampling - take every nth sample based on ratio
        if (this.resampleIndex >= this.resampleRatio) {
          this.buffer[this.bufferIndex] = inputChannel[i];
          this.bufferIndex++;
          this.resampleIndex = 0;
          
          // When buffer is full, send it and reset
          if (this.bufferIndex >= this.bufferSize) {
            // Convert float32 to int16 PCM
            const pcm16 = new Int16Array(this.bufferSize);
            for (let j = 0; j < this.bufferSize; j++) {
              // Clamp to [-1, 1] and convert to 16-bit
              const sample = Math.max(-1, Math.min(1, this.buffer[j]));
              pcm16[j] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            }
            
            // Send the PCM data to main thread
            this.port.postMessage(pcm16.buffer);
            
            // Reset buffer
            this.bufferIndex = 0;
          }
        }
        this.resampleIndex++;
      }
    }
    
    return true; // Keep processor alive
  }
}

registerProcessor('audio-processor', AudioProcessor);

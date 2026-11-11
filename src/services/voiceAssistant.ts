// src/services/voiceAssistant.ts
// Bonus #13: Hands-Free Web Speech API (SpeechRecognition + speechSynthesis) Engine
// Grounded in Indian English (en-IN) Speech & Clean TTS Synthesis

export class HandsFreeVoiceAssistant {
  private recognition: any = null;
  private synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;
  public isListening = false;
  private onTranscript: (text: string, isFinal: boolean) => void;
  private onStatusChange: (status: 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'UNSUPPORTED') => void;

  constructor(
    onTranscript: (text: string, isFinal: boolean) => void,
    onStatusChange: (status: 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'UNSUPPORTED') => void
  ) {
    this.onTranscript = onTranscript;
    this.onStatusChange = onStatusChange;
    if (typeof window === 'undefined') return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      this.onStatusChange('UNSUPPORTED');
      return;
    }

    this.recognition = new SpeechRec();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-IN'; // Optimized for Indian English accents & city pronunciations

    this.recognition.onstart = () => {
      this.isListening = true;
      this.onStatusChange('LISTENING');
    };

    this.recognition.onresult = (event: any) => {
      let interim = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      this.onTranscript(finalTranscript || interim, Boolean(finalTranscript));
    };

    this.recognition.onerror = (e: any) => {
      console.warn('SpeechRecognition error:', e);
      this.isListening = false;
      this.onStatusChange('IDLE');
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.onStatusChange('IDLE');
    };
  }

  public startListening() {
    if (!this.recognition) return;
    if (this.synth) this.synth.cancel(); // Stop TTS before listening
    try {
      this.recognition.start();
    } catch (e) {
      console.warn('Recognition already started:', e);
    }
  }

  public stopListening() {
    if (!this.recognition) return;
    try {
      this.recognition.stop();
    } catch (e) {
      console.warn('Recognition stop error:', e);
    }
  }

  public speakResponse(plainText: string) {
    if (!this.synth) return;
    this.synth.cancel();

    // Strip markdown symbols and hashtags for natural speech output
    const cleaned = plainText.replace(/[*#_`~[\]]/g, '').replace(/\s+/g, ' ').trim();

    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.lang = 'en-IN';
    utterance.rate = 1.02;

    utterance.onstart = () => this.onStatusChange('SPEAKING');
    utterance.onend = () => this.onStatusChange('IDLE');
    utterance.onerror = () => this.onStatusChange('IDLE');

    this.synth.speak(utterance);
  }

  public cancelSpeech() {
    if (this.synth) {
      this.synth.cancel();
      this.onStatusChange('IDLE');
    }
  }
}

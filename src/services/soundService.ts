import { Order } from '../types';

class SoundService {
  private announcedOrderIds = new Set<string>();
  private isMuted: boolean = false;
  private audioContext: AudioContext | null = null;
  private isAudioUnlocked: boolean = false;
  private initialLoadComplete: boolean = false;

  constructor() {
    // Check localStorage for mute preference
    const savedMute = localStorage.getItem('smartserve_voice_muted');
    if (savedMute !== null) {
      this.isMuted = savedMute === 'true';
    }
  }

  // Pre-populate announced IDs on first dashboard load so old orders are NOT announced
  public markInitialOrdersAsAnnounced(orders: Order[]): void {
    if (!this.initialLoadComplete) {
      orders.forEach((o) => this.announcedOrderIds.add(o.id));
      this.initialLoadComplete = true;
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    localStorage.setItem('smartserve_voice_muted', String(muted));
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public getIsAudioUnlocked(): boolean {
    return this.isAudioUnlocked;
  }

  // User click gesture unlocks Web Audio and SpeechSynthesis in modern browsers
  public unlockAudio(): boolean {
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
        }
      }
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      this.isAudioUnlocked = true;

      // Also prime SpeechSynthesis with a silent or micro utterance if needed
      if ('speechSynthesis' in window) {
        const dummy = new SpeechSynthesisUtterance('');
        dummy.volume = 0;
        window.speechSynthesis.speak(dummy);
      }
      return true;
    } catch (e) {
      console.warn('Audio unlock error:', e);
      return false;
    }
  }

  // Play a pleasant restaurant chime (two-tone bell)
  public playChime(): void {
    if (this.isMuted) return;
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
        }
      }
      if (!this.audioContext) return;
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Note 1 (587.33 Hz - D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.25, now + 0.03);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      // Note 2 (880 Hz - A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0, now + 0.12);
      gain2.gain.linearRampToValueAtTime(0.28, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.75);
    } catch (err) {
      console.warn('Web Audio chime could not play:', err);
    }
  }

  // Format order items into natural English, e.g.: "Two masala dosas and one chai"
  public formatOrderItemsSpeech(order: Order): string {
    if (!order.items || order.items.length === 0) return 'no items specified';

    const itemPhrases = order.items.map((item) => {
      const qtyWord = item.quantity === 1 ? 'one' : item.quantity === 2 ? 'two' : item.quantity === 3 ? 'three' : `${item.quantity}`;
      // Lowercase name, simplify special characters
      const cleanName = item.name.replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
      return `${qtyWord} ${cleanName}`;
    });

    if (itemPhrases.length === 1) {
      return itemPhrases[0];
    }
    if (itemPhrases.length === 2) {
      return `${itemPhrases[0]} and ${itemPhrases[1]}`;
    }
    const last = itemPhrases.pop();
    return `${itemPhrases.join(', ')}, and ${last}`;
  }

  // Announce newly arrived order once per session
  public announceNewOrder(order: Order): { played: boolean; message: string; blockedReason?: string } {
    const speechMessage = `New order received. Table ${order.tableNumber}. ${this.formatOrderItemsSpeech(order)}.`;

    // Only announce once per session
    if (this.announcedOrderIds.has(order.id)) {
      return { played: false, message: speechMessage, blockedReason: 'already_announced' };
    }

    this.announcedOrderIds.add(order.id);

    if (this.isMuted) {
      return { played: false, message: speechMessage, blockedReason: 'muted' };
    }

    if (!('speechSynthesis' in window)) {
      return { played: false, message: speechMessage, blockedReason: 'speech_not_supported' };
    }

    try {
      this.playChime();

      const utterance = new SpeechSynthesisUtterance(speechMessage);
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.lang = 'en-US';

      // Pick an English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      window.speechSynthesis.cancel(); // clear previous stuck speech
      window.speechSynthesis.speak(utterance);
      return { played: true, message: speechMessage };
    } catch (e) {
      return { played: false, message: speechMessage, blockedReason: e instanceof Error ? e.message : 'browser_blocked' };
    }
  }

  // Manual test trigger for Kitchen staff
  public testVoiceAlert(): { played: boolean; message: string } {
    this.unlockAudio();
    const testOrder: Order = {
      id: `test-${Date.now()}`,
      restaurantId: 'test',
      tableId: 't-test',
      tableNumber: '5',
      items: [
        { itemId: '1', name: 'Masala Dosa', price: 10, quantity: 2 },
        { itemId: '2', name: 'Chai', price: 3, quantity: 1 },
      ],
      subtotal: 23,
      tax: 2,
      total: 25,
      status: 'new',
      customerTrackingToken: 'token',
      createdAt: new Date().toISOString(),
    };
    return this.announceNewOrder(testOrder);
  }
}

export const soundService = new SoundService();

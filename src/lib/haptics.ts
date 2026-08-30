/**
 * Haptic feedback utility using Web Vibration API
 */

class HapticsManager {
  private enabled: boolean = true;

  constructor() {
    const saved = localStorage.getItem('aljadwal_haptics_enabled');
    if (saved !== null) {
      this.enabled = saved === 'true';
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('aljadwal_haptics_enabled', String(enabled));
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public trigger(pattern: number | number[] = 20) {
    if (!this.enabled || typeof window === 'undefined' || !navigator.vibrate) {
      return;
    }
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration errors on unsupporting environments
    }
  }

  // Preset feedback patterns
  public tap() {
    this.trigger(15);
  }

  public success() {
    this.trigger([30, 40, 50]);
  }

  public warning() {
    this.trigger([50, 40, 50]);
  }

  public error() {
    this.trigger([80, 50, 80]);
  }

  public tick() {
    this.trigger(8);
  }

  public heavy() {
    this.trigger(45);
  }

  public victory() {
    this.trigger([40, 40, 60, 40, 100]);
  }

  public stopAlarm() {
    this.trigger([100, 60, 100, 60, 150]);
  }
}

export const haptics = new HapticsManager();

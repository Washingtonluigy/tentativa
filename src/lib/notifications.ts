export class NotificationService {
  private static audio: HTMLAudioElement | null = null;

  static playNotificationSound() {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  }

  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('Este navegador não suporta notificações');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  static async showNotification(title: string, body: string, icon?: string) {
    const hasPermission = await this.requestPermission();

    if (hasPermission) {
      const notification = new Notification(title, {
        body,
        icon: icon || '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'amah-notification',
        requireInteraction: false,
        silent: false
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      this.playNotificationSound();
    }
  }

  static async updateBadge(count: number) {
    if ('setAppBadge' in navigator) {
      try {
        if (count > 0) {
          await (navigator as any).setAppBadge(count);
        } else {
          await (navigator as any).clearAppBadge();
        }
      } catch (error) {
        console.error('Erro ao atualizar badge:', error);
      }
    }
  }

  static async clearBadge() {
    if ('clearAppBadge' in navigator) {
      try {
        await (navigator as any).clearAppBadge();
      } catch (error) {
        console.error('Erro ao limpar badge:', error);
      }
    }
  }
}

// Planificateur de notifications : déclenche onTrigger à une heure précise.
// Le timer/caméra se lance toujours à l'heure — la popup de notification
// nécessite en plus que la permission soit accordée via enableNotifications().

export function createNotificationScheduler({ scheduledTimes = [], onTrigger } = {}) {
  const timeouts = [];

  function msUntilNext(hour, minute) {
    const now = new Date();
    const target = new Date();
    target.setHours(hour, minute, 0, 0);
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    return target.getTime() - now.getTime();
  }

  function fire() {
    if (Notification.permission === 'granted') {
      new Notification('UDT Game — Mission photo !', {
        body: '📸 Prenez une photo maintenant ! Vous avez 60 secondes.',
        icon: '/favicon.ico'
      });
    }
    onTrigger?.();
  }

  // Programmation des timeouts dès la création — pas besoin d'un clic.
  for (const { hour, minute } of scheduledTimes) {
    const delay = msUntilNext(hour, minute);
    const label = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const target = new Date(Date.now() + delay);
    const dateStr = target.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
    console.log(`[Scheduler] Déclenchement prévu à ${label} le ${dateStr} (dans ${Math.round(delay / 1000)}s)`);
    timeouts.push(setTimeout(fire, delay));
  }

  // À appeler depuis un clic pour demander la permission de notification popup.
  async function enableNotifications(onReady) {
    if (!('Notification' in window)) {
      console.warn('[Scheduler] Notifications non supportées.');
      onReady?.({ granted: false });
      return false;
    }
    if (Notification.permission === 'denied') {
      console.warn('[Scheduler] Permission refusée. Autorise les notifications dans les réglages du navigateur.');
      onReady?.({ granted: false });
      return false;
    }
    if (Notification.permission === 'granted') {
      onReady?.({ granted: true });
      return true;
    }
    const result = await Notification.requestPermission();
    const granted = result === 'granted';
    onReady?.({ granted });
    return granted;
  }

  // Déclenche immédiatement pour tester.
  function testFire() {
    console.log('[Scheduler] Test manuel déclenché');
    fire();
  }

  function remove() {
    timeouts.forEach(clearTimeout);
    timeouts.length = 0;
  }

  return { enableNotifications, testFire, remove };
}

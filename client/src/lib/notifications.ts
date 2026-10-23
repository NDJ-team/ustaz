/**
 * Событие «список уведомлений изменился».
 * Страница уведомлений сообщает о прочтении, а AppShell обновляет счётчик
 * без ожидания следующего опроса.
 */
export const NOTIFICATIONS_CHANGED_EVENT = 'ustaz:notifications-changed';

export function announceNotificationsChanged(): void {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}

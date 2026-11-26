// Non-blocking messages (replaces the browser's alert box, which freezes the page).
export function notify(message: string) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('azhar-notify', { detail: message }));
}

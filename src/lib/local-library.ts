// Per-device lists kept in the browser (no account needed).
export type Mini = { id: number | string; title: string; author?: string | null; at: number };
const read = (k: string): Mini[] => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };
const write = (k: string, v: Mini[]) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export const getRecent = () => read('azhar-recent');
export function addRecent(m: Omit<Mini, 'at'>) {
  const l = read('azhar-recent').filter(x => String(x.id) !== String(m.id));
  write('azhar-recent', [{ ...m, at: Date.now() }, ...l].slice(0, 20));
}
export const clearRecent = () => write('azhar-recent', []);

export const getReading = () => read('azhar-reading');
export const inReading = (id: number | string) => read('azhar-reading').some(x => String(x.id) === String(id));
export function toggleReading(m: Omit<Mini, 'at'>) {
  const l = read('azhar-reading');
  const has = l.some(x => String(x.id) === String(m.id));
  write('azhar-reading', has ? l.filter(x => String(x.id) !== String(m.id)) : [{ ...m, at: Date.now() }, ...l].slice(0, 200));
  return !has;
}

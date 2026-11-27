export type CiteItem = {
  id: number | string; title: string; author?: string | null; date_issued?: string | null;
  publisher?: string | null; language?: string | null;
};

const authors = (a?: string | null) => (a || '').split(/[;؛]|\sو\s(?=[^\s]+\s[^\s]+)/).map(s => s.replace(/^د\.\s*/, '').trim()).filter(Boolean);
const yearOrNull = (d?: string | null) => (d || '').match(/\d{4}/)?.[0] || null;
const isAr = (s: string) => /[\u0600-\u06FF]/.test(s);
const isGroup = (n: string) => /\d|-|\b(library|libraries|university|press|association|committee|team|group|college|ifla|federation|institute|section)\b/i.test(n) || n.split(/\s+/).length > 4;

function apaName(n: string) {
  if (isAr(n) || isGroup(n)) return n;
  const p = n.split(/\s+/);
  if (p.length < 2) return n;
  const last = p[p.length - 1];
  return `${last}, ${p.slice(0, -1).map(x => x[0].toUpperCase() + '.').join(' ')}`;
}

export function apa(i: CiteItem, url: string) {
  const a = authors(i.author).map(apaName);
  const who = a.length === 0 ? '' : a.length === 1 ? a[0] : a.slice(0, -1).join(', ') + ', & ' + a[a.length - 1];
  return `${who ? who + '. ' : ''}(${yearOrNull(i.date_issued) || (isAr(i.title) ? 'د.ت' : 'n.d.')}). ${i.title}. ${i.publisher ? i.publisher + '. ' : ''}${url}`;
}

export function bibtex(i: CiteItem, url: string) {
  const first = authors(i.author)[0] || 'item';
  const key = ((isGroup(first) ? first.split(/\s+/)[0] : first.split(/\s+/).pop()) || 'item').replace(/[^A-Za-z0-9\u0600-\u06FF]/g, '') + (yearOrNull(i.date_issued) || 'nd') + 'id' + i.id;
  const e = (s: string) => s.replace(/[{}]/g, '');
  return `@book{${key},\n  title = {${e(i.title)}},\n  author = {${authors(i.author).map(e).join(' and ')}},\n${yearOrNull(i.date_issued) ? `  year = {${yearOrNull(i.date_issued)}},\n` : ''}  publisher = {${e(i.publisher || '')}},\n  url = {${url}}\n}`;
}

export function ris(i: CiteItem, url: string) {
  return ['TY  - BOOK', ...authors(i.author).map(a => `AU  - ${a}`), `TI  - ${i.title}`, ...(yearOrNull(i.date_issued) ? [`PY  - ${yearOrNull(i.date_issued)}`] : []),
    ...(i.publisher ? [`PB  - ${i.publisher}`] : []), ...(i.language ? [`LA  - ${i.language}`] : []), `UR  - ${url}`, 'ER  - '].join('\n');
}

import { SITE_URL } from '@/lib/constants';

const LANG: Record<string, string> = { 'العربية': 'ar', 'الإنجليزية': 'en', 'الفارسية': 'fa', 'الفرنسية': 'fr', 'التركية': 'tr', 'الألمانية': 'de', 'الإندونيسية': 'id', 'الإسبانية': 'es', 'الأردية': 'ur', 'الملايوية': 'ms', 'الكردية': 'ku' };
export const langCodes = (l?: string | null) => (l || '').split(/[،,]/).map(x => LANG[x.trim()]).filter(Boolean) as string[];
export const yearOf = (d?: string | null) => (d || '').match(/\d{4}/)?.[0] || '';
export const authorsOf = (a?: string | null) => (a || '').split(/\s*[;؛]\s*/).map(x => x.trim()).filter(Boolean);

const SCHEMA_TYPE: Record<string, string> = {
  books: 'Book', bibliographies: 'Book', theses: 'Thesis', research: 'ScholarlyArticle', periodicals: 'ScholarlyArticle',
  manuscripts: 'Manuscript', lectures: 'LearningResource',
};

export function itemJsonLd(item: any, hasFile: boolean) {
  const url = `${SITE_URL}/item/${item.id}`;
  const langs = langCodes(item.language);
  const ld: any = {
    '@context': 'https://schema.org',
    '@type': SCHEMA_TYPE[item.collection_slug] || 'CreativeWork',
    '@id': url, url, name: item.title,
    author: authorsOf(item.author).map(name => ({ '@type': 'Person', name })),
    description: (item.abstract || '').slice(0, 500),
    inLanguage: langs[0] || undefined,
    datePublished: yearOf(item.date_issued) || undefined,
    publisher: item.publisher ? { '@type': 'Organization', name: item.publisher } : undefined,
    keywords: item.keywords || undefined,
    isAccessibleForFree: item.access === 'open',
    license: typeof item.metadata?.license === 'string' ? item.metadata.license : item.rights || undefined,
    isPartOf: { '@type': 'CollectionPage', name: item.collection, url: `${SITE_URL}/collections/${item.collection_slug}` },
    sourceOrganization: { '@type': 'CollegeOrUniversity', name: 'جامعة الأزهر - كلية اللغة العربية بالمنوفية' },
  };
  if (hasFile) ld.encoding = { '@type': 'MediaObject', contentUrl: `${url}/pdf`, encodingFormat: 'application/pdf' };
  return JSON.parse(JSON.stringify(ld));
}

export function citationMeta(item: any, hasFile: boolean): Record<string, string | string[]> {
  const m: Record<string, string | string[]> = { citation_title: item.title };
  const au = authorsOf(item.author); if (au.length) m.citation_author = au;
  const y = yearOf(item.date_issued); if (y) m.citation_publication_date = y;
  const l = langCodes(item.language)[0]; if (l) m.citation_language = l;
  if (item.publisher) m.citation_publisher = item.publisher;
  if (item.metadata?.journal) m.citation_journal_title = item.metadata.journal;
  if (item.collection_slug === 'theses') m.citation_dissertation_institution = item.publisher || 'جامعة الأزهر';
  m.citation_abstract_html_url = `${SITE_URL}/item/${item.id}`;
  if (hasFile && item.access === 'open') m.citation_pdf_url = `${SITE_URL}/item/${item.id}/pdf`;
  if (item.keywords) m.citation_keywords = item.keywords;
  return m;
}

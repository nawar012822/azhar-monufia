import { serverClient } from '@/lib/supabase';
import { SITE_URL } from '@/lib/constants';
import { itemJsonLd, langCodes, yearOf, authorsOf } from '@/lib/scholarly';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// OAI-PMH 2.0 provider (Dublin Core) so harvesters (CORE, BASE, OpenAIRE, Google Scholar) can index the repository.
const PAGE = 100;
const HOST = new URL(SITE_URL).host;
const xml = (s: any) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!)).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
const iso = (d: string) => new Date(d).toISOString().replace(/\.\d{3}Z$/, 'Z');
const oid = (id: number | string) => `oai:${HOST}:${id}`;
const SEL = 'id,created_at,updated_at,title,author,abstract,keywords,language,date_issued,publisher,rights,access,collections(slug)';

function wrap(req: URL, verb: string | null, body: string, err?: [string, string]) {
  const attrs = verb && !err ? ` verb="${xml(verb)}"` : '';
  // per OAI-PMH 2.0 section 3.6 only badVerb/badArgument must omit the request attributes
  const bare = !!err && (err[0] === 'badVerb' || err[0] === 'badArgument');
  const reqAttrs = bare ? '' : Array.from(req.searchParams.keys()).map(k => ` ${xml(k)}="${xml(req.searchParams.get(k))}"`).join('');
  const out = `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
<responseDate>${iso(new Date().toISOString())}</responseDate>
<request${reqAttrs}>${SITE_URL}/oai</request>
${err ? `<error code="${err[0]}">${xml(err[1])}</error>` : body}
</OAI-PMH>`;
  void attrs;
  return new Response(out, { headers: { 'content-type': 'text/xml; charset=utf-8', 'cache-control': 'public, max-age=300' } });
}

const col = (r: any) => (Array.isArray(r.collections) ? r.collections[0] : r.collections)?.slug || 'uncategorized';
const header = (r: any) => `<header><identifier>${oid(r.id)}</identifier><datestamp>${iso(r.updated_at || r.created_at)}</datestamp><setSpec>${xml(col(r))}</setSpec></header>`;
function record(r: any) {
  const kw = (r.keywords || '').split(/[,،]/).map((x: string) => x.trim()).filter(Boolean);
  const dc = [
    ['title', r.title], ...authorsOf(r.author).map(a => ['creator', a]), ...kw.map((k: string) => ['subject', k]),
    ['description', r.abstract], ['publisher', r.publisher], ['date', yearOf(r.date_issued) || r.date_issued], ['type', 'text'],
    ['format', 'application/pdf'], ['identifier', `${SITE_URL}/item/${r.id}`], ...langCodes(r.language).map(l => ['language', l]), ['rights', r.rights],
  ].filter(([, v]) => v).map(([k, v]) => `<dc:${k}>${xml(v)}</dc:${k}>`).join('');
  return `<record>${header(r)}<metadata><oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/ http://www.openarchives.org/OAI/2.0/oai_dc.xsd">${dc}</oai_dc:dc></metadata></record>`;
}

export async function GET(request: Request) {
  const url = new URL(request.url); const q = url.searchParams; const verb = q.get('verb');
  const sb = serverClient();
  const known = ['Identify', 'ListMetadataFormats', 'ListSets', 'ListIdentifiers', 'ListRecords', 'GetRecord'];
  if (!verb || !known.includes(verb)) return wrap(url, verb, '', ['badVerb', 'Illegal or missing verb']);
  if (q.getAll('verb').length > 1) return wrap(url, null, '', ['badVerb', 'Repeated verb']);
  // Argument rules from OAI-PMH 2.0 section 3: illegal, repeated, missing and exclusive arguments are badArgument.
  const rules: Record<string, { req: string[]; opt: string[] }> = {
    Identify: { req: [], opt: [] },
    ListMetadataFormats: { req: [], opt: ['identifier'] },
    ListSets: { req: [], opt: ['resumptionToken'] },
    GetRecord: { req: ['identifier', 'metadataPrefix'], opt: [] },
    ListIdentifiers: { req: ['metadataPrefix'], opt: ['from', 'until', 'set', 'resumptionToken'] },
    ListRecords: { req: ['metadataPrefix'], opt: ['from', 'until', 'set', 'resumptionToken'] },
  };
  {
    const r = rules[verb]; const keys = Array.from(new Set(Array.from(q.keys()).filter(k => k !== 'verb')));
    const bad = (m: string) => wrap(url, verb, '', ['badArgument', m]);
    for (const k of keys) { if (!r.req.includes(k) && !r.opt.includes(k)) return bad(`Illegal argument: ${k}`); if (q.getAll(k).length > 1) return bad(`Repeated argument: ${k}`); }
    if (q.has('resumptionToken')) { if (keys.length > 1) return bad('resumptionToken is an exclusive argument'); }
    else for (const k of r.req) if (!q.get(k)) return bad(`Missing required argument: ${k}`);
  }

  if (verb === 'Identify') {
    const { data } = await sb.from('items').select('created_at,updated_at').eq('status', 'approved').order('updated_at').limit(1);
    return wrap(url, verb, `<Identify><repositoryName>المستودع الرقمي - كلية اللغة العربية بالمنوفية</repositoryName><baseURL>${SITE_URL}/oai</baseURL><protocolVersion>2.0</protocolVersion><adminEmail>ahmadnawar012822@gmail.com</adminEmail><earliestDatestamp>${iso(data?.[0]?.updated_at || data?.[0]?.created_at || '2026-01-01')}</earliestDatestamp><deletedRecord>no</deletedRecord><granularity>YYYY-MM-DDThh:mm:ssZ</granularity></Identify>`);
  }
  if (verb === 'ListMetadataFormats' && q.get('identifier')) {
    const id = (q.get('identifier') || '').replace(`oai:${HOST}:`, '');
    const found = /^\d+$/.test(id) ? (await sb.from('items').select('id').eq('id', id).eq('status', 'approved').maybeSingle()).data : null;
    if (!found) return wrap(url, verb, '', ['idDoesNotExist', 'Unknown identifier']);
  }
  if (verb === 'ListMetadataFormats')
    return wrap(url, verb, `<ListMetadataFormats><metadataFormat><metadataPrefix>oai_dc</metadataPrefix><schema>http://www.openarchives.org/OAI/2.0/oai_dc.xsd</schema><metadataNamespace>http://www.openarchives.org/OAI/2.0/oai_dc/</metadataNamespace></metadataFormat></ListMetadataFormats>`);
  if (verb === 'ListSets') {
    const { data } = await sb.from('collections').select('slug,name_ar');
    return wrap(url, verb, `<ListSets>${(data || []).map((c: any) => `<set><setSpec>${xml(c.slug)}</setSpec><setName>${xml(c.name_ar)}</setName></set>`).join('')}</ListSets>`);
  }
  if (verb === 'GetRecord') {
    if (q.get('metadataPrefix') !== 'oai_dc') return wrap(url, verb, '', ['cannotDisseminateFormat', 'Only oai_dc is supported']);
    const id = (q.get('identifier') || '').replace(`oai:${HOST}:`, '');
    if (!/^\d+$/.test(id)) return wrap(url, verb, '', ['idDoesNotExist', 'Unknown identifier']);
    const { data } = await sb.from('items').select(SEL).eq('id', id).eq('status', 'approved').maybeSingle();
    if (!data) return wrap(url, verb, '', ['idDoesNotExist', 'Unknown identifier']);
    return wrap(url, verb, `<GetRecord>${record(data)}</GetRecord>`);
  }
  // ListIdentifiers / ListRecords
  let offset = 0, from = q.get('from'), until = q.get('until'), set = q.get('set');
  const tok = q.get('resumptionToken');
  if (tok) {
    try { const t = JSON.parse(Buffer.from(tok, 'base64url').toString()); offset = Number(t.o) || 0; from = t.f || null; until = t.u || null; set = t.s || null; }
    catch { return wrap(url, verb, '', ['badResumptionToken', 'Invalid token']); }
  } else if (q.get('metadataPrefix') !== 'oai_dc') return wrap(url, verb, '', ['cannotDisseminateFormat', 'Only oai_dc is supported']);
  let qb = sb.from('items').select(SEL, { count: 'exact' }).eq('status', 'approved').order('id').range(offset, offset + PAGE - 1);
  const okDate = (d: string) => /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}Z)?$/.test(d) && !isNaN(Date.parse(d));
  if ((from && !okDate(from)) || (until && !okDate(until))) return wrap(url, verb, '', ['badArgument', 'from/until must be YYYY-MM-DD or YYYY-MM-DDThh:mm:ssZ']);
  if (from && until && from.length !== until.length) return wrap(url, verb, '', ['badArgument', 'from and until must use the same granularity']);
  // datestamps in headers are updated_at, so the selective-harvest filter must use updated_at too
  const upper = (u: string) => (u.length === 10 ? u + 'T23:59:59Z' : u);
  if (from) qb = qb.gte('updated_at', from); if (until) qb = qb.lte('updated_at', upper(until));
  if (set) { const { data: c } = await sb.from('collections').select('id').eq('slug', set).maybeSingle(); if (!c) return wrap(url, verb, '', ['noRecordsMatch', 'Unknown set']); qb = qb.eq('collection_id', c.id); }
  const { data, count } = await qb;
  if (!data?.length) return wrap(url, verb, '', ['noRecordsMatch', 'No records']);
  const total = count ?? 0, next = offset + PAGE < total
    ? `<resumptionToken completeListSize="${total}" cursor="${offset}">${Buffer.from(JSON.stringify({ o: offset + PAGE, f: from, u: until, s: set })).toString('base64url')}</resumptionToken>`
    : `<resumptionToken completeListSize="${total}" cursor="${offset}"/>`;
  const list = verb === 'ListIdentifiers' ? data.map(header).join('') : data.map(record).join('');
  return wrap(url, verb, `<${verb}>${list}${next}</${verb}>`);
}

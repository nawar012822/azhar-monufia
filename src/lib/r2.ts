import { createHash, createHmac } from 'crypto';

// Presigned GET for Cloudflare R2 (S3-compatible, SigV4). No SDK needed.
const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
const hmac = (k: Buffer | string, d: string) => createHmac('sha256', k).update(d).digest();

export function r2Configured() {
  return !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET);
}

export function presignR2Get(key: string, opts: { expires?: number; downloadName?: string } = {}): string {
  const account = process.env.R2_ACCOUNT_ID!, ak = process.env.R2_ACCESS_KEY_ID!, sk = process.env.R2_SECRET_ACCESS_KEY!, bucket = process.env.R2_BUCKET!;
  const host = `${account}.r2.cloudflarestorage.com`;
  const now = new Date();
  const amz = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const date = amz.slice(0, 8);
  const scope = `${date}/auto/s3/aws4_request`;
  const path = '/' + [bucket, ...key.split('/')].map(enc).join('/');
  const q: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${ak}/${scope}`,
    'X-Amz-Date': amz,
    'X-Amz-Expires': String(opts.expires ?? 300),
    'X-Amz-SignedHeaders': 'host',
  };
  if (opts.downloadName) q['response-content-disposition'] = `attachment; filename*=UTF-8''${enc(opts.downloadName)}`;
  q['response-content-type'] = 'application/pdf';
  const qs = Object.keys(q).sort().map(k => `${enc(k)}=${enc(q[k])}`).join('&');
  const canonical = ['GET', path, qs, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const sts = ['AWS4-HMAC-SHA256', amz, scope, createHash('sha256').update(canonical).digest('hex')].join('\n');
  const kDate = hmac('AWS4' + sk, date), kReg = hmac(kDate, 'auto'), kSvc = hmac(kReg, 's3'), kSig = hmac(kSvc, 'aws4_request');
  const sig = createHmac('sha256', kSig).update(sts).digest('hex');
  return `https://${host}${path}?${qs}&X-Amz-Signature=${sig}`;
}

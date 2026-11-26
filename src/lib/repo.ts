import { SUPABASE_URL } from './supabase';

// What list pages and item pages select. Embeds: collection, org (department), counters.
export const ITEM_SELECT =
  'id,created_at,title,author,abstract,keywords,access,status,date_issued,publisher,rights,metadata,org_id,collection_id,' +
  'collections(slug,name_ar,icon),orgs(name_ar,path),item_stats(views,downloads)';

export type Role = 'uploader' | 'moderator' | 'admin';
export const ROLE_RANK: Record<Role, number> = { uploader: 1, moderator: 2, admin: 3 };
export const ROLE_AR: Record<string, string> = { uploader: 'رافع مواد', moderator: 'مراجع', admin: 'مدير' };
export const STATUS_AR: Record<string, string> = {
  approved: 'منشور', pending: 'قيد المراجعة', rejected: 'مرفوض', draft: 'مسودة', withdrawn: 'مسحوب',
};
export const ACCESS_AR: Record<string, string> = { open: 'متاح للجميع', restricted: 'للمسجلين فقط', metadata: 'بيانات فقط' };

const one = (x: any) => (Array.isArray(x) ? x[0] : x);

// Flatten an embedded row to the shape the pages use.
export function flat(r: any) {
  const c = one(r.collections), o = one(r.orgs), s = one(r.item_stats);
  return {
    ...r,
    collection: c?.name_ar || '', collection_slug: c?.slug || '', collection_icon: c?.icon || '',
    department: o?.name_ar || '', dept_path: o?.path || '',
    views: s?.views ?? 0, downloads: s?.downloads ?? 0,
  };
}

export type Membership = { org_id: number; role: Role; can_publish: boolean };
export type Access = {
  userId: string | null; isSuper: boolean; memberships: Membership[];
  best: number;            // highest role rank anywhere (0 = viewer only)
  canReview: boolean;      // moderator or admin somewhere, or super admin
  canUpload: boolean;      // has any role, or super admin
};

export async function loadAccess(sb: any): Promise<Access> {
  const { data: { user } } = await sb.auth.getUser();
  const empty: Access = { userId: null, isSuper: false, memberships: [], best: 0, canReview: false, canUpload: false };
  if (!user) return empty;
  const [{ data: sup }, { data: mem }] = await Promise.all([
    sb.rpc('is_platform_admin'),
    sb.from('memberships').select('org_id,role,can_publish').eq('user_id', user.id),
  ]);
  const memberships: Membership[] = mem || [];
  const best = Math.max(0, ...memberships.map(m => ROLE_RANK[m.role] || 0));
  const isSuper = sup === true;
  return {
    userId: user.id, isSuper, memberships, best,
    canReview: isSuper || best >= 2, canUpload: isSuper || best >= 1,
  };
}

// Descendant org ids (including the node itself) for a path.
export async function subtreeIds(sb: any, path: string): Promise<number[]> {
  const { data } = await sb.from('orgs').select('id,path').or(`path.eq.${path},path.like.${path}/%`);
  return (data || []).map((x: any) => x.id);
}

// Where a stored file is served from. Old files sit in the public "books" bucket; new ones in the private "files" bucket.
export function publicFileUrl(bucket: string, key: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;
}
export async function fileLink(sb: any, f: { bucket: string; file_key: string }, download = false): Promise<string | null> {
  if (f.bucket === 'books') return publicFileUrl('books', f.file_key) + (download ? '?download' : '');
  const { data, error } = await sb.storage.from(f.bucket).createSignedUrl(f.file_key, 3600, download ? { download: true } : undefined);
  return error ? null : data?.signedUrl || null;
}

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const SITE_NAME = 'المستودع الرقمي | كلية اللغة العربية';
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://azhar-repo.vercel.app').replace(/\/$/, '');

export const COLLECTIONS = [
  { id: 'كتب ومراجع', name: 'الكتب والمراجع', icon: '📚' },
  { id: 'رسائل جامعية', name: 'الرسائل الجامعية', icon: '🎓' },
  { id: 'أبحاث علمية', name: 'الأبحاث العلمية', icon: '🔬' },
  { id: 'مخطوطات', name: 'المخطوطات والتراث', icon: '📜' },
  { id: 'إنتاج هيئة التدريس', name: 'إنتاج أعضاء هيئة التدريس', icon: '🖋️' },
  { id: 'مشروعات الطلاب', name: 'مشروعات الطلاب', icon: '📝' },
  { id: 'الدوريات والمجلات', name: 'الدوريات والمجلات', icon: '📰' },
  { id: 'المحاضرات والمواد', name: 'المحاضرات والمواد التعليمية', icon: '🎧' },
];

// Columns used by list pages (no "select *").
export const LIST_COLUMNS =
  'id,created_at,title,author,abstract,collection,department,access,views,status';

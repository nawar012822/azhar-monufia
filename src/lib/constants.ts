export const SITE_NAME = 'المستودع الرقمي | جامعة الأزهر';
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://azhar-repo.vercel.app').replace(/\/$/, '');

// Root of the tree shown on this site. Add more universities later by adding rows, not code.
export const ROOT_PATH = process.env.NEXT_PUBLIC_ROOT_PATH || 'azhar';
export const DEFAULT_FACULTY_PATH = process.env.NEXT_PUBLIC_FACULTY_PATH || 'azhar/arabic-shebin';

export const COLLECTIONS = [
  { slug: 'books', name: 'الكتب والمراجع', icon: '📚' },
  { slug: 'theses', name: 'الرسائل الجامعية', icon: '🎓' },
  { slug: 'research', name: 'الأبحاث العلمية', icon: '🔬' },
  { slug: 'manuscripts', name: 'المخطوطات والتراث', icon: '📜' },
  { slug: 'faculty-output', name: 'إنتاج أعضاء هيئة التدريس', icon: '🖋️' },
  { slug: 'student-projects', name: 'مشروعات الطلاب', icon: '📝' },
  { slug: 'periodicals', name: 'الدوريات والمجلات', icon: '📰' },
  { slug: 'lectures', name: 'المحاضرات والمواد التعليمية', icon: '🎧' },
];

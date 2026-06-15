// 账本分类（共享给新增 / 编辑弹窗，避免两处不一致）
export interface Category {
  label: string;
  value: string;
  emoji: string;
}

export const CATEGORIES: Category[] = [
  { label: '喂养用品', value: 'feeding', emoji: '🍼' },
  { label: '护理清洁', value: 'care', emoji: '🧴' },
  { label: '辅食零食', value: 'food', emoji: '🍪' },
  { label: '医疗健康', value: 'medical', emoji: '🏥' },
  { label: '衣物穿戴', value: 'clothing', emoji: '👶' },
  { label: '大件用品', value: 'gear', emoji: '🛒' },
  { label: '外出相关', value: 'outing', emoji: '🚗' },
  { label: '其他', value: 'other', emoji: '📦' },
];

/** 按 value 或 label 找分类 */
export function findCategory(key: string | undefined | null): Category | undefined {
  if (!key) return undefined;
  return CATEGORIES.find((c) => c.value === key || c.label === key);
}

/** 取分类 emoji，未知分类回退 🏷️ */
export function categoryEmoji(key: string | undefined | null): string {
  return findCategory(key)?.emoji ?? '🏷️';
}

/** 把内部 value 或已是 label 的值，统一成展示用 label */
export function categoryLabel(key: string | undefined | null): string {
  if (!key) return '未分类';
  return findCategory(key)?.label ?? key;
}

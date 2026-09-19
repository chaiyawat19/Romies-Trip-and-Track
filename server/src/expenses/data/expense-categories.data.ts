import { ExpenseCategory } from '@prisma/client';

export interface ExpenseCategoryInfo {
  key: ExpenseCategory;
  nameTh: string;
  icon: string;
}

export const EXPENSE_CATEGORIES: ExpenseCategoryInfo[] = [
  { key: ExpenseCategory.FOOD, nameTh: 'ค่ากิน', icon: '🍲' },
  { key: ExpenseCategory.FUEL, nameTh: 'ค่าน้ำมัน', icon: '⛽' },
  { key: ExpenseCategory.TRANSPORTATION, nameTh: 'ค่ารถ', icon: '🚗' },
  { key: ExpenseCategory.ACCOMMODATION, nameTh: 'ค่าที่พัก', icon: '🏨' },
  { key: ExpenseCategory.TICKET, nameTh: 'ค่าตั๋ว', icon: '🎟️' },
  { key: ExpenseCategory.RENTAL, nameTh: 'ค่าเช่าอุปกรณ์', icon: '🏄' },
  { key: ExpenseCategory.ENTRANCE_FEE, nameTh: 'ค่าเข้าสถานที่', icon: '🎫' },
  { key: ExpenseCategory.TOLLWAY, nameTh: 'ค่าทางด่วน', icon: '🛣️' },
  { key: ExpenseCategory.SHOPPING, nameTh: 'ค่าของฝาก/ช็อปปิ้ง', icon: '🛍️' },
  { key: ExpenseCategory.SERVICE, nameTh: 'ค่าบริการ', icon: '🛎️' },
  { key: ExpenseCategory.COMMON_FUND, nameTh: 'เงินกองกลาง', icon: '💰' },
];

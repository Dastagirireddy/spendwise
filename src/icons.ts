import { addCollection } from 'iconify-icon';
import { icons as lucideIcons } from '@iconify-json/lucide';

addCollection(lucideIcons);

export const ICONS = {
  logo: 'lucide:wallet',
  dashboard: 'lucide:layout-dashboard',
  addExpense: 'lucide:plus-circle',
  monthly: 'lucide:calendar',
  categories: 'lucide:tag',
  trendingUp: 'lucide:trending-up',
  alert: 'lucide:alert-triangle',
  lightbulb: 'lucide:lightbulb',
  arrowRight: 'lucide:arrow-right',
  check: 'lucide:check',
  delete: 'lucide:trash-2',
  close: 'lucide:x',
  savings: 'lucide:piggy-bank',
  reports: 'lucide:bar-chart-3',
  profile: 'lucide:user',
  profilePlus: 'lucide:user-plus',
  chevronDown: 'lucide:chevron-down',
  chevronLeft: 'lucide:chevron-left',
  chevronRight: 'lucide:chevron-right',
  download: 'lucide:download',
  target: 'lucide:target',
  clock: 'lucide:clock',
  calendarDays: 'lucide:calendar-days',
} as const;

export const CATEGORY_ICONS = [
  { name: 'lucide:utensils', label: 'Food' },
  { name: 'lucide:car', label: 'Transport' },
  { name: 'lucide:shopping-bag', label: 'Shopping' },
  { name: 'lucide:file-text', label: 'Bills' },
  { name: 'lucide:gamepad-2', label: 'Entertainment' },
  { name: 'lucide:pill', label: 'Health' },
  { name: 'lucide:book-open', label: 'Education' },
  { name: 'lucide:package', label: 'Other' },
  { name: 'lucide:home', label: 'Housing' },
  { name: 'lucide:plane', label: 'Travel' },
  { name: 'lucide:coffee', label: 'Coffee' },
  { name: 'lucide:film', label: 'Movies' },
  { name: 'lucide:scissors', label: 'Haircut' },
  { name: 'lucide:paw-print', label: 'Pets' },
  { name: 'lucide:music', label: 'Music' },
  { name: 'lucide:shopping-cart', label: 'Grocery' },
  { name: 'lucide:gift', label: 'Gifts' },
  { name: 'lucide:monitor', label: 'Computer' },
  { name: 'lucide:smartphone', label: 'Phone' },
  { name: 'lucide:bus', label: 'Transit' },
  { name: 'lucide:fuel', label: 'Gas' },
  { name: 'lucide:cake', label: 'Birthday' },
  { name: 'lucide:dumbbell', label: 'Gym' },
  { name: 'lucide:zap', label: 'Electricity' },
  { name: 'lucide:wifi', label: 'Internet' },
  { name: 'lucide:droplets', label: 'Water' },
  { name: 'lucide:apple', label: 'Fruits' },
  { name: 'lucide:leaf', label: 'Vegetables' },
  { name: 'lucide:scan-line', label: 'Recharge' },
  { name: 'lucide:key', label: 'Rent' },
  { name: 'lucide:shirt', label: 'Clothing' },
  { name: 'lucide:baby', label: 'Kids' },
  { name: 'lucide:heart-pulse', label: 'Medical' },
  { name: 'lucide:graduation-cap', label: 'Fees' },
  { name: 'lucide:washing-machine', label: 'Laundry' },
  { name: 'lucide:dog', label: 'Pet Food' },
  { name: 'lucide:popcorn', label: 'Snacks' },
  { name: 'lucide:beer', label: 'Drinks' },
  { name: 'lucide:banknote', label: 'Salary' },
  { name: 'lucide:trending-up', label: 'Investment' },
] as const;

export const PAYMENT_TYPES = [
  { value: 'cash', label: 'Cash', icon: 'lucide:banknote' },
  { value: 'upi', label: 'UPI', icon: 'lucide:smartphone' },
  { value: 'phonepe', label: 'PhonePe', icon: 'lucide:smartphone' },
  { value: 'gpay', label: 'Google Pay', icon: 'lucide:smartphone' },
  { value: 'paytm', label: 'Paytm', icon: 'lucide:smartphone' },
  { value: 'netbanking', label: 'Net Banking', icon: 'lucide:landmark' },
  { value: 'credit_card', label: 'Credit Card', icon: 'lucide:credit-card' },
  { value: 'debit_card', label: 'Debit Card', icon: 'lucide:credit-card' },
] as const;

export type IconName = string;

export function icon(name: IconName, size?: number): string {
  const s = size ? ` width="${size}"` : '';
  return `<iconify-icon icon="${name}"${s}></iconify-icon>`;
}

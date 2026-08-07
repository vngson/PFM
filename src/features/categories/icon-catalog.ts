// Whitelist icon dùng cho category + account.
// Thêm/bớt ở đây thì icon-picker tự cập nhật. Mỗi entry có:
//   - name: tên icon (PascalCase) từ lucide-react
//   - label: function trả về tên hiển thị theo locale (Paraglide).
//     Function pattern (không phải string) để `m.*()` resolve locale
//     đúng trong cả RSC và client renders (tránh hydration mismatch).
//   - keywords: extra search tokens cho picker.

import {
  Utensils,
  Coffee,
  Car,
  Fuel,
  ShoppingBag,
  Gamepad2,
  Receipt,
  Home,
  HeartPulse,
  GraduationCap,
  Gift,
  Plane,
  Shirt,
  Smartphone,
  Wifi,
  Wallet,
  Trophy,
  TrendingUp,
  PlusCircle,
  PiggyBank,
  Briefcase,
  CreditCard,
  Banknote,
  Building2,
  Bitcoin,
  BookOpen,
  Music,
  Film,
  Camera,
  Dumbbell,
  Pill,
  Stethoscope,
  Baby,
  PawPrint,
  Wrench,
  Lightbulb,
  PaintBucket,
  Hammer,
  ScrollText,
  CircleDollarSign,
  type LucideIcon,
} from 'lucide-react';
import * as m from '@/paraglide/messages';

export interface IconOption {
  name: string;
  /** Function (not string) so Paraglide resolves locale per-render. */
  label: () => string;
  keywords: string[];
  Icon: LucideIcon;
}

export const ICON_CATALOG: IconOption[] = [
  // Chi tiêu (expense)
  { name: 'Utensils', label: () => m.icon_label_utensils(), keywords: ['food', 'an', 'nha hang', 'restaurant'], Icon: Utensils },
  { name: 'Coffee', label: () => m.icon_label_coffee(), keywords: ['cafe', 'coffee', 'uong'], Icon: Coffee },
  { name: 'Car', label: () => m.icon_label_car(), keywords: ['transport', 'oto', 'xe'], Icon: Car },
  { name: 'Fuel', label: () => m.icon_label_fuel(), keywords: ['gas', 'xang'], Icon: Fuel },
  { name: 'Plane', label: () => m.icon_label_plane(), keywords: ['travel', 'may bay', 'vacation'], Icon: Plane },
  { name: 'ShoppingBag', label: () => m.icon_label_shopping_bag(), keywords: ['shopping', 'mua sam'], Icon: ShoppingBag },
  { name: 'Shirt', label: () => m.icon_label_shirt(), keywords: ['clothes', 'fashion', 'thoi trang'], Icon: Shirt },
  { name: 'Gamepad2', label: () => m.icon_label_gamepad(), keywords: ['game', 'entertainment'], Icon: Gamepad2 },
  { name: 'Music', label: () => m.icon_label_music(), keywords: ['music', 'nhac'], Icon: Music },
  { name: 'Film', label: () => m.icon_label_film(), keywords: ['movie', 'phim'], Icon: Film },
  { name: 'Camera', label: () => m.icon_label_camera(), keywords: ['photo', 'anh'], Icon: Camera },
  { name: 'Receipt', label: () => m.icon_label_receipt(), keywords: ['bill', 'dien', 'nuoc'], Icon: Receipt },
  { name: 'Wifi', label: () => m.icon_label_wifi(), keywords: ['wifi', '4g', 'data'], Icon: Wifi },
  { name: 'Smartphone', label: () => m.icon_label_smartphone(), keywords: ['phone', 'mobile'], Icon: Smartphone },
  { name: 'Home', label: () => m.icon_label_home(), keywords: ['house', 'nha', 'rent'], Icon: Home },
  { name: 'Wrench', label: () => m.icon_label_wrench(), keywords: ['repair', 'sua'], Icon: Wrench },
  { name: 'Hammer', label: () => m.icon_label_hammer(), keywords: ['tools', 'furniture'], Icon: Hammer },
  { name: 'PaintBucket', label: () => m.icon_label_paint_bucket(), keywords: ['decor', 'paint'], Icon: PaintBucket },
  { name: 'Lightbulb', label: () => m.icon_label_lightbulb(), keywords: ['light', 'electricity'], Icon: Lightbulb },
  { name: 'HeartPulse', label: () => m.icon_label_heart_pulse(), keywords: ['health', 'sk'], Icon: HeartPulse },
  { name: 'Pill', label: () => m.icon_label_pill(), keywords: ['medicine', 'thuoc'], Icon: Pill },
  { name: 'Stethoscope', label: () => m.icon_label_stethoscope(), keywords: ['doctor', 'bac si', 'hospital'], Icon: Stethoscope },
  { name: 'Dumbbell', label: () => m.icon_label_dumbbell(), keywords: ['gym', 'sport', 'the thao'], Icon: Dumbbell },
  { name: 'GraduationCap', label: () => m.icon_label_graduation_cap(), keywords: ['education', 'hoc', 'school'], Icon: GraduationCap },
  { name: 'BookOpen', label: () => m.icon_label_book_open(), keywords: ['book', 'sach'], Icon: BookOpen },
  { name: 'Baby', label: () => m.icon_label_baby(), keywords: ['baby', 'kid', 'tre em'], Icon: Baby },
  { name: 'PawPrint', label: () => m.icon_label_paw_print(), keywords: ['pet', 'cho', 'meo'], Icon: PawPrint },
  { name: 'Gift', label: () => m.icon_label_gift(), keywords: ['gift', 'qua'], Icon: Gift },
  { name: 'ScrollText', label: () => m.icon_label_scroll_text(), keywords: ['fee', 'phi', 'other'], Icon: ScrollText },

  // Thu nhập (income) + tài khoản
  { name: 'Briefcase', label: () => m.icon_label_briefcase(), keywords: ['work', 'job', 'cong viec'], Icon: Briefcase },
  { name: 'Wallet', label: () => m.icon_label_wallet(), keywords: ['salary', 'luong'], Icon: Wallet },
  { name: 'Trophy', label: () => m.icon_label_trophy(), keywords: ['bonus', 'thuong'], Icon: Trophy },
  { name: 'TrendingUp', label: () => m.icon_label_trending_up(), keywords: ['invest', 'dau tu', 'stock'], Icon: TrendingUp },
  { name: 'Bitcoin', label: () => m.icon_label_bitcoin(), keywords: ['crypto', 'coin'], Icon: Bitcoin },
  { name: 'PiggyBank', label: () => m.icon_label_piggy_bank(), keywords: ['save', 'tiet kiem'], Icon: PiggyBank },
  { name: 'PlusCircle', label: () => m.icon_label_plus_circle(), keywords: ['income', 'thu nhap'], Icon: PlusCircle },
  { name: 'CircleDollarSign', label: () => m.icon_label_circle_dollar(), keywords: ['cash', 'tien mat'], Icon: CircleDollarSign },

  // Tài khoản
  { name: 'Banknote', label: () => m.icon_label_banknote(), keywords: ['cash', 'tien mat'], Icon: Banknote },
  { name: 'Building2', label: () => m.icon_label_building(), keywords: ['bank', 'ngan hang'], Icon: Building2 },
  { name: 'CreditCard', label: () => m.icon_label_credit_card(), keywords: ['credit', 'the tin dung'], Icon: CreditCard },
];

/** Tra cứu nhanh theo tên (dùng khi render category có sẵn). */
export const ICON_BY_NAME = new Map(ICON_CATALOG.map((o) => [o.name, o]));

/** Lấy icon theo tên, fallback CircleDollarSign nếu không tìm thấy. */
export function getIcon(name: string | null | undefined): LucideIcon {
  if (!name) return CircleDollarSign;
  return ICON_BY_NAME.get(name)?.Icon ?? CircleDollarSign;
}
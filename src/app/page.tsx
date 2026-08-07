// Root redirect: bare "/" không match /[locale]/* nên 404. Trỏ về baseLocale
// (mặc định "vi") để user có landing URL sạch. Locale-aware logic (login vs
// dashboard) xử lý ở [locale]/page.tsx.
import { redirect } from 'next/navigation';
import { baseLocale } from '@/paraglide/runtime';

export default function RootPage(): never {
  redirect(`/${baseLocale}`);
}

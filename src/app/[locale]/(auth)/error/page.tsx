// Trang thông báo lỗi auth (vd: link xác nhận hết hạn, mã code sai).
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { buildLocalizedHref, getLocale } from '@/lib/i18n/locale-path';
import * as m from '@/paraglide/messages';

interface ErrorPageProps {
  searchParams: Promise<{ message?: string }>;
}

export default async function ErrorPage({ searchParams }: ErrorPageProps) {
  const { message } = await searchParams;

  return (
    <Card className="w-full text-center">
      <CardHeader className="items-center">
        <div className="mb-2 inline-flex size-16 items-center justify-center border-2 border-border bg-destructive text-destructive-foreground shadow-brutal-sm">
          <AlertCircle className="size-8" aria-hidden="true" />
        </div>
        <CardTitle className="text-2xl">{m.auth_error_title()}</CardTitle>
        <CardDescription>{message ?? m.auth_error_default()}</CardDescription>
      </CardHeader>
      <CardContent />
      <CardFooter className="justify-center gap-2">
        <Button variant="outline" render={<Link href={buildLocalizedHref("/login", getLocale())} />}>
          {m.auth_error_back_login()}
        </Button>
        <Button render={<Link href={buildLocalizedHref("/signup", getLocale())} />}>{m.auth_error_signup_again()}</Button>
      </CardFooter>
    </Card>
  );
}

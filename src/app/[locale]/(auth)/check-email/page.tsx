// Trang thông báo "vui lòng kiểm tra email" sau khi signup.
// Email hiển thị qua search param để user biết đã nhập đúng chưa.
import Link from 'next/link';
import { MailCheck } from 'lucide-react';
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

interface CheckEmailPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function CheckEmailPage({ searchParams }: CheckEmailPageProps) {
  const { email } = await searchParams;

  return (
    <Card className="w-full text-center">
      <CardHeader className="items-center">
        <div className="mb-2 inline-flex size-16 items-center justify-center border-2 border-border bg-success text-success-foreground shadow-brutal-sm">
          <MailCheck className="size-8" aria-hidden="true" />
        </div>
        <CardTitle className="text-2xl">{m.auth_check_email()}</CardTitle>
        <CardDescription>
          {m.auth_check_email_sent_to({
            email: email ?? m.auth_check_email_default_email(),
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {m.auth_check_email_spam_hint()}
        </p>
      </CardContent>
      <CardFooter className="justify-center">
        <Button variant="outline" render={<Link href={buildLocalizedHref("/login", getLocale())} />}>
          {m.auth_check_email_back()}
        </Button>
      </CardFooter>
    </Card>
  );
}

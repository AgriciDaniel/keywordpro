import { Logo } from '@/components/layout/logo';
import { Button } from '@/components/ui/button';
import { LocaleLink } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

/**
 * Note that `app/[locale]/[...rest]/page.tsx`
 * is necessary for this page to render.
 *
 * https://next-intl.dev/docs/environments/error-files#not-foundjs
 * https://next-intl.dev/docs/environments/error-files#catching-non-localized-requests
 */
export default function NotFound() {
  const t = useTranslations('NotFoundPage');

  return (
    <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-8">
      <Logo className="size-12" />

      <h1 className="text-4xl font-bold">{t('title')}</h1>

      <p className="text-balance text-center text-xl font-medium px-4">
        {t('message')}
      </p>

      <Button asChild size="lg" variant="default" className="cursor-pointer">
        <LocaleLink href="/">{t('backToHome')}</LocaleLink>
      </Button>
    </div>
  );
}

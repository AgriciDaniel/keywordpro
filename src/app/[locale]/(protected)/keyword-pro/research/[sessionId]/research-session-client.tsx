'use client';

import { ResearchConsole } from '@/components/research-console/ResearchConsole';
import { useBreadcrumbs } from '@/contexts/breadcrumb-context';
import { useLocaleRouter } from '@/i18n/navigation';
import type { ResearchSessionDetail } from '@/lib/research/console-types';
import { Routes } from '@/routes';
import { ArrowLeft, FlaskConical } from 'lucide-react';
import { useEffect } from 'react';

export function ResearchSessionClient({
  session,
}: {
  session: ResearchSessionDetail | null;
}) {
  const router = useLocaleRouter();
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    const title = session?.title ?? 'New research';
    setBreadcrumbs([
      { label: 'Keyword research' },
      { label: title, isCurrentPage: true },
    ]);
  }, [session, setBreadcrumbs]);

  if (!session) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8 md:px-8">
        <div className="mx-auto max-w-xl rounded-xl border border-[#3E3E3E] bg-[#191919] p-6">
          <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-[#3E3E3E] bg-[#252525] text-[#87A9FF]">
            <FlaskConical className="size-5" />
          </div>
          <h1 className="font-semibold text-[#E2E2E5] text-xl">
            Keyword report unavailable
          </h1>
          <p className="mt-2 text-[#9CA3AF] text-sm">
            This keyword report could not be loaded.
          </p>
          <button
            className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#3E3E3E] bg-[#252525] px-4 text-[#E2E2E5] text-sm transition hover:border-[#87A9FF]/50 hover:text-[#87A9FF]"
            onClick={() => router.push(Routes.KeywordPro)}
            type="button"
          >
            <ArrowLeft className="size-4" />
            Keyword research
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <ResearchConsole
        initialEndpointSelection={session.endpointSelection}
        initialFilters={session.filters}
        initialInput={session.input}
        initialResults={session.results}
        initialTab={session.primaryTab}
        mode="article"
        researchSessionId={session.id}
      />
    </div>
  );
}

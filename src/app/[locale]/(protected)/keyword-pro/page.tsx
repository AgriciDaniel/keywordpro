'use client';

import { ResearchConsole } from '@/components/research-console/ResearchConsole';
import { useBreadcrumbs } from '@/contexts/breadcrumb-context';
import { useEffect } from 'react';

export default function ResearchDashboardPage() {
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([{ label: 'Keyword research', isCurrentPage: true }]);
  }, [setBreadcrumbs]);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <ResearchConsole mode="article" />
    </div>
  );
}

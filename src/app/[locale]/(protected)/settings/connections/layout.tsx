import { DashboardHeader } from '@/components/dashboard/dashboard-header';

export default function ConnectionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const breadcrumbs = [
    { label: 'Settings', isCurrentPage: false },
    { label: 'Connections', isCurrentPage: true },
  ];

  return (
    <>
      <DashboardHeader breadcrumbs={breadcrumbs} />

      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="space-y-8 px-4 lg:px-6">
              <div className="max-w-3xl">
                <h1 className="font-medium text-[#EDE7DC] text-2xl tracking-tight">
                  Connections
                </h1>
                <p className="mt-1.5 text-[#9F9A92] text-sm leading-6">
                  The DataForSEO connection used by Keyword Pro, and where its
                  credentials come from.
                </p>
              </div>

              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

import { getResearchSessionForUser } from '@/lib/research/research-session-queries';
import { getSession } from '@/lib/server';
import { ResearchSessionClient } from './research-session-client';

export default async function ResearchSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await getSession();
  const researchSession = session?.user?.id
    ? await getResearchSessionForUser(session.user.id, sessionId)
    : null;

  return (
    <ResearchSessionClient session={researchSession} />
  );
}

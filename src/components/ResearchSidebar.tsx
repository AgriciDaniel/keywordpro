'use client';

import {
  deleteResearchSessionAction,
  renameResearchSessionAction,
  getRecentResearchSessionsAction,
  toggleResearchSessionPinAction,
} from '@/actions/research-session-actions';
import { ResearchSessionRow } from '@/components/research-sidebar/ResearchSessionRow';
import type { ResearchSessionSummary } from '@/lib/research/console-types';
import { Loader2, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export function ResearchSidebar({
  projectId,
  activeResearchSessionId,
  isCollapsed = false,
  refreshTrigger = 0,
  onSelectResearch,
  onNewResearch,
  onDeletedResearch,
}: {
  projectId?: string | null;
  activeResearchSessionId?: string | null;
  isCollapsed?: boolean;
  refreshTrigger?: number;
  onSelectResearch: (session: ResearchSessionSummary) => void;
  onNewResearch: () => void;
  onDeletedResearch?: (session: ResearchSessionSummary) => void;
}) {
  const [sessions, setSessions] = useState<ResearchSessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const sortSessions = useCallback((items: ResearchSessionSummary[]) => {
    return [...items].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      if (a.isPinned && b.isPinned) {
        return (a.pinnedOrder ?? Number.MAX_SAFE_INTEGER) -
          (b.pinnedOrder ?? Number.MAX_SAFE_INTEGER);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, []);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        getRecentResearchSessionsAction({
          projectId: projectId ?? undefined,
          limit: 20,
        }),
        new Promise<null>((resolve) => {
          timeoutId = setTimeout(() => resolve(null), 6000);
        }),
      ]);
      setSessions(sortSessions(result?.data ?? []));
    } catch (error) {
      console.error('Failed to load research sessions:', error);
      setSessions([]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, [projectId, sortSessions]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions, refreshTrigger]);

  useEffect(() => {
    const refresh = () => loadSessions();
    window.addEventListener('keyword-pro:refresh-research', refresh);
    return () => {
      window.removeEventListener('keyword-pro:refresh-research', refresh);
    };
  }, [loadSessions]);

  const handleRename = useCallback(
    async (session: ResearchSessionSummary, title: string) => {
      const previous = sessions;
      // Optimistic: the row renames instantly and rolls back only if the
      // server rejects it.
      setSessions((current) =>
        current.map((item) =>
          item.id === session.id ? { ...item, title } : item,
        ),
      );
      try {
        await renameResearchSessionAction({ id: session.id, title });
      } catch {
        setSessions(previous);
      }
    },
    [sessions],
  );

  const handleTogglePin = useCallback(
    async (session: ResearchSessionSummary) => {
      const previous = sessions;
      const nextPinned = !session.isPinned;
      const maxPinnedOrder = previous.reduce(
        (max, item) => Math.max(max, item.pinnedOrder ?? 0),
        0,
      );
      setSessions((current) =>
        sortSessions(
          current.map((item) =>
            item.id === session.id
              ? {
                  ...item,
                  isPinned: nextPinned,
                  pinnedOrder: nextPinned ? maxPinnedOrder + 1 : null,
                }
              : item,
          ),
        ),
      );

      try {
        const result = await toggleResearchSessionPinAction({ id: session.id });
        const persistedPinned = result?.data ?? nextPinned;
        setSessions((current) =>
          sortSessions(
            current.map((item) =>
              item.id === session.id
                ? {
                    ...item,
                    isPinned: persistedPinned,
                    pinnedOrder: persistedPinned ? item.pinnedOrder : null,
                  }
                : item,
            ),
          ),
        );
      } catch (error) {
        console.error('Failed to toggle research pin:', error);
        setSessions(previous);
      }
    },
    [sessions, sortSessions],
  );

  const handleDelete = useCallback(
    async (session: ResearchSessionSummary) => {
      const confirmed = window.confirm(`Delete "${session.title}"?`);
      if (!confirmed) return;

      const previous = sessions;
      setSessions((current) => current.filter((item) => item.id !== session.id));

      try {
        await deleteResearchSessionAction({ id: session.id });
        if (activeResearchSessionId === session.id) {
          onDeletedResearch?.(session);
        }
      } catch (error) {
        console.error('Failed to delete research chat:', error);
        setSessions(previous);
      }
    },
    [activeResearchSessionId, onDeletedResearch, sessions],
  );

  const pinnedSessions = sessions.filter((session) => session.isPinned);
  const recentSessions = sessions.filter((session) => !session.isPinned);

  const renderRows = (items: ResearchSessionSummary[]) =>
    items.map((session) => (
      <ResearchSessionRow
        isActive={activeResearchSessionId === session.id}
        key={session.id}
        onClick={() => onSelectResearch(session)}
        onDelete={() => handleDelete(session)}
        onRename={(title) => handleRename(session, title)}
        onTogglePin={() => handleTogglePin(session)}
        session={session}
      />
    ));

  if (isCollapsed) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center gap-2">
        <button
          aria-label="New keyword research"
          className="inline-flex size-10 items-center justify-center rounded-lg text-[#D8D1C7] transition hover:bg-white/[0.06] hover:text-white"
          onClick={onNewResearch}
          type="button"
        >
          <Plus className="size-5" />
        </button>
        <div className="flex min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {isLoading ? (
            <Loader2 className="mt-2 size-4 animate-spin text-[#9CA3AF]" />
          ) : (
            sessions.map((session) => (
              <ResearchSessionRow
                isActive={activeResearchSessionId === session.id}
                isCollapsed
                key={session.id}
                onClick={() => onSelectResearch(session)}
                onDelete={() => handleDelete(session)}
                onTogglePin={() => handleTogglePin(session)}
                session={session}
              />
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1">
      <button
        className="flex h-8 w-full items-center gap-2 rounded-md px-2 font-medium text-[#F4F1EA] text-sm transition hover:bg-white/[0.055]"
        onClick={onNewResearch}
        type="button"
      >
        <Plus className="size-4 shrink-0 text-[#BDB7AD]" />
        <span className="truncate">New keyword research</span>
      </button>

      <div className="px-2 pb-1 pt-4">
        <div className="flex items-center gap-2 text-[#9F9A92] text-xs">
          <span className="font-medium">Chats</span>
          {isLoading ? <Loader2 className="size-3 animate-spin" /> : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {sessions.length > 0 ? (
          <div className="space-y-3">
            {pinnedSessions.length > 0 ? (
              <div className="space-y-1">
                <div className="px-2 text-[#9F9A92] text-xs">Pinned</div>
                {renderRows(pinnedSessions)}
              </div>
            ) : null}
            {recentSessions.length > 0 ? (
              <div className="space-y-1">
                {pinnedSessions.length > 0 ? (
                  <div className="px-2 text-[#9F9A92] text-xs">Recent</div>
                ) : null}
                {renderRows(recentSessions)}
              </div>
            ) : null}
          </div>
        ) : isLoading ? (
          <div className="space-y-1 px-1 py-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                className="h-8 rounded-lg bg-white/[0.035]"
                key={index}
              />
            ))}
          </div>
        ) : (
          <div className="px-2 py-2 text-[#9F9A92] text-sm leading-5">
            Start a keyword search to build your research trail.
          </div>
        )}
      </div>
    </div>
  );
}

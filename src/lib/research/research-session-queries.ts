import 'server-only';

import { getDb } from '@/db';
import {
  keywordProResearchOpportunity,
  keywordProResearchSession,
} from '@/db/schema';
import type {
  ResearchEndpointSelection,
  ResearchFilters,
  ResearchOpportunity,
  ResearchSessionDetail,
  ResearchSessionStatus,
  ResearchSessionSummary,
  ResearchSource,
  ResearchTab,
} from '@/lib/research/console-types';
import { DEFAULT_RESEARCH_FILTERS } from '@/lib/research/console-types';
import { reprojectSavedResults } from '@/lib/research/reproject';
import { and, eq, sql } from 'drizzle-orm';

export function toResearchSessionSummary(row: {
  id: string;
  title: string;
  primaryTab: string;
  status: string;
  isPinned?: number | null;
  pinnedOrder?: number | null;
  summary: string | null;
  topOpportunityTitle: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ResearchSessionSummary {
  return {
    id: row.id,
    title: row.title,
    primaryTab: row.primaryTab as ResearchTab,
    status: row.status as ResearchSessionStatus,
    isPinned: row.isPinned === 1,
    pinnedOrder: row.pinnedOrder ?? null,
    topOpportunityTitle: row.topOpportunityTitle ?? row.summary ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function normalizeFilters(value: unknown): ResearchFilters {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_RESEARCH_FILTERS;
  }
  const filters = value as Partial<ResearchFilters>;
  return {
    location: filters.location ?? DEFAULT_RESEARCH_FILTERS.location,
    language: filters.language ?? DEFAULT_RESEARCH_FILTERS.language,
    device: filters.device ?? DEFAULT_RESEARCH_FILTERS.device,
    searchEngine: filters.searchEngine ?? DEFAULT_RESEARCH_FILTERS.searchEngine,
  };
}

function normalizeEndpointSelection(
  value: unknown,
): ResearchEndpointSelection | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as ResearchEndpointSelection;
}

function normalizeOpportunityMeta(
  value: unknown,
): ResearchOpportunity['meta'] | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as ResearchOpportunity['meta'];
}

export async function getResearchSessionForUser(
  userId: string,
  sessionId: string,
): Promise<ResearchSessionDetail | null> {
  const db = await getDb();

  const row = await db
    .select({
      id: keywordProResearchSession.id,
      title: keywordProResearchSession.title,
      input: keywordProResearchSession.input,
      inputType: keywordProResearchSession.inputType,
      filters: keywordProResearchSession.filters,
      endpointSelection: keywordProResearchSession.endpointSelection,
      source: keywordProResearchSession.source,
      results: keywordProResearchSession.results,
      primaryTab: keywordProResearchSession.primaryTab,
      status: keywordProResearchSession.status,
      isPinned: keywordProResearchSession.isPinned,
      pinnedOrder: keywordProResearchSession.pinnedOrder,
      summary: keywordProResearchSession.summary,
      topOpportunityTitle: sql<string | null>`(
        select ${keywordProResearchOpportunity.title}
        from ${keywordProResearchOpportunity}
        where ${keywordProResearchOpportunity.researchSessionId} = ${keywordProResearchSession.id}
        order by ${keywordProResearchOpportunity.rank} asc
        limit 1
      )`,
      createdAt: keywordProResearchSession.createdAt,
      updatedAt: keywordProResearchSession.updatedAt,
    })
    .from(keywordProResearchSession)
    .where(
      and(
        eq(keywordProResearchSession.userId, userId),
        eq(keywordProResearchSession.id, sessionId),
        eq(keywordProResearchSession.inputType, 'keyword'),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!row) return null;

  const opportunityRows = await db
    .select({
      id: keywordProResearchOpportunity.id,
      rank: keywordProResearchOpportunity.rank,
      title: keywordProResearchOpportunity.title,
      intent: keywordProResearchOpportunity.intent,
      searchVolume: keywordProResearchOpportunity.searchVolume,
      keywordDifficulty: keywordProResearchOpportunity.keywordDifficulty,
      cpc: keywordProResearchOpportunity.cpc,
      sourceTab: keywordProResearchOpportunity.sourceTab,
      meta: keywordProResearchOpportunity.meta,
    })
    .from(keywordProResearchOpportunity)
    .where(eq(keywordProResearchOpportunity.researchSessionId, row.id))
    .orderBy(keywordProResearchOpportunity.rank);

  return {
    ...toResearchSessionSummary(row),
    input: row.input,
    inputType: row.inputType as ResearchSessionDetail['inputType'],
    filters: normalizeFilters(row.filters),
    endpointSelection: normalizeEndpointSelection(row.endpointSelection),
    source: row.source as ResearchSource,
    summary: row.summary ?? undefined,
    // Replayed through today's projectors, so a session saved before a
    // projector fix shows the corrected data without a second provider call.
    results: reprojectSavedResults(
      Array.isArray(row.results)
        ? (row.results as ResearchSessionDetail['results'])
        : undefined,
    ),
    opportunities: opportunityRows.map((opportunity) => ({
      id: opportunity.id,
      rank: opportunity.rank,
      title: opportunity.title,
      intent: opportunity.intent as ResearchOpportunity['intent'],
      searchVolume: opportunity.searchVolume,
      keywordDifficulty: opportunity.keywordDifficulty,
      cpc:
        opportunity.cpc === null || opportunity.cpc === undefined
          ? null
          : Number(opportunity.cpc),
      sourceTab: opportunity.sourceTab as ResearchTab,
      meta: normalizeOpportunityMeta(opportunity.meta),
    })),
  };
}

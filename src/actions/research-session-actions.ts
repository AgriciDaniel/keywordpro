'use server';

import { getDb } from '@/db';
import {
  keywordProResearchOpportunity,
  keywordProResearchSession,
} from '@/db/schema';
import type {
  ResearchInputType,
} from '@/lib/research/console-types';
import { DEFAULT_RESEARCH_FILTERS } from '@/lib/research/console-types';
import {
  getResearchSessionForUser,
  toResearchSessionSummary,
} from '@/lib/research/research-session-queries';
import { userActionClient } from '@/lib/safe-action';
import { Routes } from '@/routes';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

type Ctx = { user: { id: string } };

const researchTabSchema = z.enum([
  'keywords',
  'serp',
  'questions',
  'clusters',
  'competitors',
]);
const inputTypeSchema = z.enum(['topic', 'keyword', 'domain']);

const filtersSchema = z.object({
  location: z.string().min(2).max(64).default(DEFAULT_RESEARCH_FILTERS.location),
  language: z.string().min(2).max(32).default(DEFAULT_RESEARCH_FILTERS.language),
  device: z.enum(['desktop', 'mobile', 'tablet']).default('desktop'),
  searchEngine: z.enum(['google', 'bing', 'duckduckgo']).default('google'),
});

const endpointSelectionSchema = z
  .object({
    providers: z
      .array(z.enum(['dataforseo']))
      .default([]),
    sources: z
      .array(z.enum(['keywords', 'serp']))
      .default([]),
    format: z
      .enum(['dashboard', 'table', 'brief', 'markdown', 'json', 'links'])
      .default('dashboard'),
    category: z
      .enum(['seo'])
      .default('seo'),
    options: z
      .object({
        limit: z.number().int().min(1).max(100).default(10),
        freshness: z.enum(['any', '24h', '7d', '30d']).default('any'),
        includePageContent: z.boolean().default(false),
        mainContentOnly: z.boolean().default(true),
        parsePdf: z.boolean().default(false),
        enhancedMode: z.boolean().default(false),
      })
      .default({
        limit: 10,
        freshness: 'any',
        includePageContent: false,
        mainContentOnly: true,
        parsePdf: false,
        enhancedMode: false,
      }),
  })
  .optional();

const requestSchema = z.object({
  mode: z.enum(['marketing', 'article']),
  tab: researchTabSchema,
  input: z.string().default(''),
  inputType: inputTypeSchema.optional(),
  filters: filtersSchema.default(DEFAULT_RESEARCH_FILTERS),
  endpointSelection: endpointSelectionSchema,
  projectId: z.string().optional(),
  researchSessionId: z.string().optional(),
  articleId: z.string().optional(),
});

const getRecentResearchSessionsSchema = z.object({
  projectId: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

const getResearchSessionSchema = z.object({
  id: z.string(),
});

const deleteResearchSessionSchema = z.object({
  id: z.string(),
});

const toggleResearchSessionPinSchema = z.object({
  id: z.string(),
});

const _createArticleFromOpportunitySchema = z.object({
  opportunityId: z.string(),
});

function detectInputType(input: string): ResearchInputType {
  const value = input.trim();
  if (/^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i.test(value)) {
    return 'domain';
  }
  if (value.split(/\s+/).length <= 5) return 'keyword';
  return 'topic';
}

function titleFromInput(input: string) {
  const clean = input.trim().replace(/\s+/g, ' ');
  return clean || 'New research';
}

export const getRecentResearchSessionsAction = userActionClient
  .schema(getRecentResearchSessionsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const userId = (ctx as Ctx).user.id;
    const db = await getDb();
    const whereClause = and(
      eq(keywordProResearchSession.userId, userId),
      eq(keywordProResearchSession.inputType, 'keyword'),
    );

    const rows = await db
      .select({
        id: keywordProResearchSession.id,
        title: keywordProResearchSession.title,
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
      .where(whereClause)
      .orderBy(
        desc(keywordProResearchSession.isPinned),
        asc(sql`COALESCE(${keywordProResearchSession.pinnedOrder}, 2147483647)`),
        desc(keywordProResearchSession.createdAt),
      )
      .limit(parsedInput.limit);

    return rows.map(toResearchSessionSummary);
  });

export const getResearchSessionAction = userActionClient
  .schema(getResearchSessionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const userId = (ctx as Ctx).user.id;
    return getResearchSessionForUser(userId, parsedInput.id);
  });

export const createResearchSessionAction = userActionClient
  .schema(requestSchema)
  .action(async ({ parsedInput, ctx }) => {
    const userId = (ctx as Ctx).user.id;
    const db = await getDb();
    const now = new Date();
    const input = parsedInput.input.trim();
    const id = nanoid();

    await db.insert(keywordProResearchSession).values({
      id,
      userId,
      title: titleFromInput(input),
      input,
      inputType: parsedInput.inputType ?? detectInputType(input),
      primaryTab: parsedInput.tab,
      filters: parsedInput.filters,
      endpointSelection: parsedInput.endpointSelection ?? null,
      status: 'completed',
      source: 'mock',
      summary: null,
      createdAt: now,
      updatedAt: now,
    });

    revalidatePath(Routes.KeywordPro);
    return { id };
  });

const runResultSchema = z.object({
  type: z.string(),
  label: z.string(),
  response: z.unknown().nullable(),
  error: z.string().nullable(),
});

const saveResearchRunSchema = z.object({
  sessionId: z.string().nullable().optional(),
  input: z.string(),
  inputType: z.enum(['topic', 'keyword', 'domain']).optional(),
  tab: z.enum(['keywords', 'serp', 'questions', 'clusters', 'competitors']),
  filters: z.unknown(),
  endpointSelection: z.unknown().optional(),
  results: z.array(runResultSchema),
});

/**
 * Persist a completed run so it shows in the sidebar and can be reopened
 * without spending anything. Updates in place when the session already exists,
 * so re-running inside one chat does not spawn duplicates.
 */
export const saveResearchRunAction = userActionClient
  .schema(saveResearchRunSchema)
  .action(async ({ parsedInput, ctx }) => {
    const userId = (ctx as Ctx).user.id;
    const db = await getDb();
    const now = new Date();
    const input = parsedInput.input.trim();

    const shared = {
      input,
      inputType: parsedInput.inputType ?? detectInputType(input),
      primaryTab: parsedInput.tab,
      filters: parsedInput.filters as never,
      endpointSelection: (parsedInput.endpointSelection ?? null) as never,
      results: parsedInput.results as never,
      status: 'completed' as const,
      source: 'live' as const,
      summary: parsedInput.results
        .map((result) => result.label)
        .slice(0, 3)
        .join(', '),
      updatedAt: now,
    };

    if (parsedInput.sessionId) {
      const existing = await db
        .select({
          id: keywordProResearchSession.id,
          input: keywordProResearchSession.input,
          title: keywordProResearchSession.title,
        })
        .from(keywordProResearchSession)
        .where(
          and(
            eq(keywordProResearchSession.userId, userId),
            eq(keywordProResearchSession.id, parsedInput.sessionId),
          ),
        )
        .limit(1)
        .then((rows) => rows[0] ?? null);

      if (existing) {
        await db
          .update(keywordProResearchSession)
          .set({
            ...shared,
            // Without this the row keeps its old name while its input and
            // results are replaced, so a sidebar entry labelled "seo tools"
            // silently comes to hold a completely different search. Renames
            // are preserved: only a session still carrying its generated
            // title is re-titled.
            ...(existing.title === titleFromInput(existing.input)
              ? { title: titleFromInput(input) }
              : {}),
          })
          .where(eq(keywordProResearchSession.id, existing.id));
        revalidatePath(Routes.KeywordPro);
        return { id: existing.id };
      }
    }

    const id = nanoid();
    await db.insert(keywordProResearchSession).values({
      id,
      userId,
      title: titleFromInput(input),
      createdAt: now,
      ...shared,
    });

    revalidatePath(Routes.KeywordPro);
    return { id };
  });

const renameResearchSessionSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1).max(120),
});

export const renameResearchSessionAction = userActionClient
  .schema(renameResearchSessionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const userId = (ctx as Ctx).user.id;
    const db = await getDb();

    await db
      .update(keywordProResearchSession)
      .set({ title: parsedInput.title, updatedAt: new Date() })
      .where(
        and(
          eq(keywordProResearchSession.userId, userId),
          eq(keywordProResearchSession.id, parsedInput.id),
        ),
      );

    revalidatePath(Routes.KeywordPro);
    return { ok: true };
  });

export const deleteResearchSessionAction = userActionClient
  .schema(deleteResearchSessionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const userId = (ctx as Ctx).user.id;
    const db = await getDb();

    await db
      .delete(keywordProResearchSession)
      .where(
        and(
          eq(keywordProResearchSession.userId, userId),
          eq(keywordProResearchSession.id, parsedInput.id),
        ),
      );

    revalidatePath(Routes.KeywordPro);
    return { ok: true };
  });

export const toggleResearchSessionPinAction = userActionClient
  .schema(toggleResearchSessionPinSchema)
  .action(async ({ parsedInput, ctx }) => {
    const userId = (ctx as Ctx).user.id;
    const db = await getDb();
    const now = new Date();
    const current = await db
      .select({ isPinned: keywordProResearchSession.isPinned })
      .from(keywordProResearchSession)
      .where(
        and(
          eq(keywordProResearchSession.userId, userId),
          eq(keywordProResearchSession.id, parsedInput.id),
        ),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!current) throw new Error('Research chat not found.');

    const nextPinned = current.isPinned === 1 ? 0 : 1;

    if (nextPinned === 1) {
      const maxPinnedOrder = await db
        .select({
          max: sql<number>`max(${keywordProResearchSession.pinnedOrder})`,
        })
        .from(keywordProResearchSession)
        .where(
          and(
            eq(keywordProResearchSession.userId, userId),
            eq(keywordProResearchSession.isPinned, 1),
          ),
        )
        .then((rows) => rows[0]?.max ?? 0);

      await db
        .update(keywordProResearchSession)
        .set({
          isPinned: 1,
          pinnedOrder: Number(maxPinnedOrder) + 1,
          updatedAt: now,
        })
        .where(
          and(
            eq(keywordProResearchSession.userId, userId),
            eq(keywordProResearchSession.id, parsedInput.id),
          ),
        );
    } else {
      await db
        .update(keywordProResearchSession)
        .set({
          isPinned: 0,
          pinnedOrder: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(keywordProResearchSession.userId, userId),
            eq(keywordProResearchSession.id, parsedInput.id),
          ),
        );
    }

    revalidatePath(Routes.KeywordPro);
    return nextPinned === 1;
  });

import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

/**
 * Standalone schema: five tables.
 *
 * The upstream schema was 59 tables and 1,249 lines, covering auth sessions,
 * OAuth accounts, Stripe payments, a credit ledger with reservations, projects,
 * articles, brand data, E-E-A-T signals, newsletters and an anti-abuse
 * subsystem. None of that exists here.
 *
 * `user` survives because it is the ownership spine: research sessions and the
 * encrypted credentials row both foreign-key to it. Exactly one row is seeded
 * by `scripts/seed-local-user.ts`; there is no signup path.
 *
 * Versioned migrations preserve existing encrypted credentials and saved
 * reports while moving physical objects onto canonical Keyword Pro names.
 */

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const keywordProUserSettings = pgTable(
  'keyword_pro_user_settings',
  {
    userId: text('user_id').primaryKey(),
    displayName: text('display_name'),
    bio: text('bio'),
    avatarUrl: text('avatar_url'),
    presetAvatar: text('preset_avatar'),
    timeZone: text('time_zone'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'keyword_pro_user_settings_user_id_user_id_fk',
    }).onDelete('cascade'),
  ],
);

/**
 * Provider credentials entered on the Connections tab.
 * Every value is AES-256-GCM encrypted by `@/keyword-pro/crypto` before it
 * lands here, and is never returned to the browser in plaintext.
 */
export const keywordProApiCredentials = pgTable(
  'keyword_pro_api_credentials',
  {
    userId: text('user_id').primaryKey(),
    dataforseoLogin: text('dataforseo_login'),
    dataforseoPassword: text('dataforseo_password'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'keyword_pro_api_credentials_user_id_user_id_fk',
    }).onDelete('cascade'),
  ],
);

export const keywordProResearchSession = pgTable(
  'keyword_pro_research_sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    title: text('title').notNull(),
    input: text('input').notNull(),
    inputType: text('input_type').notNull(),
    primaryTab: text('primary_tab').notNull(),
    filters: jsonb('filters').notNull(),
    endpointSelection: jsonb('endpoint_selection'),
    status: text('status').notNull().default('completed'),
    source: text('source').notNull().default('live'),
    summary: text('summary'),
    /**
     * Cached endpoint results, so reopening a saved search costs nothing.
     * Guided bundles keep the projected rows and panels but intentionally drop
     * untouched provider envelopes and per-row `_full` records before saving.
     * Individual advanced runs can still retain a raw response when present.
     */
    results: jsonb('results'),
    isPinned: integer('is_pinned').notNull().default(0),
    pinnedOrder: integer('pinned_order'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'keyword_pro_research_sessions_user_id_user_id_fk',
    }).onDelete('cascade'),
    index('keyword_pro_research_sessions_user_created_idx').on(
      table.userId,
      table.createdAt,
    ),
    index('keyword_pro_research_sessions_pinned_idx').on(
      table.userId,
      table.isPinned,
    ),
    index(
      'keyword_pro_research_sessions_pinned_order_idx',
    ).on(table.userId, table.isPinned, table.pinnedOrder),
    check(
      'keyword_pro_research_sessions_input_type_check',
      sql`${table.inputType} in ('topic','keyword','domain')`,
    ),
    check(
      'keyword_pro_research_sessions_status_check',
      sql`${table.status} in ('running','completed','failed')`,
    ),
    check(
      'keyword_pro_research_sessions_source_check',
      sql`${table.source} in ('live','mock','hybrid')`,
    ),
  ],
);

export const keywordProResearchOpportunity = pgTable(
  'keyword_pro_research_opportunities',
  {
    id: text('id').primaryKey(),
    researchSessionId: text('research_session_id').notNull(),
    rank: integer('rank').notNull(),
    title: text('title').notNull(),
    intent: text('intent').notNull(),
    searchVolume: integer('search_volume'),
    keywordDifficulty: integer('keyword_difficulty'),
    cpc: numeric('cpc', { precision: 8, scale: 2 }),
    sourceTab: text('source_tab').notNull(),
    meta: jsonb('meta'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.researchSessionId],
      foreignColumns: [keywordProResearchSession.id],
      name: 'keyword_pro_research_opportunities_research_session_id_fk',
    }).onDelete('cascade'),
    index('keyword_pro_research_opportunities_session_idx').on(
      table.researchSessionId,
      table.rank,
    ),
  ],
);

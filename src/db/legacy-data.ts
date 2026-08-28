import { createHash } from 'node:crypto';
import {
  chmod,
  realpath,
  unlink,
  writeFile,
} from 'node:fs/promises';
import {
  basename,
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from 'node:path';
import type { Sql, TransactionSql } from 'postgres';

type QuerySql = Sql | TransactionSql;

export type LegacySessionClassification =
  | 'keyword-compatible'
  | 'legacy-nonkeyword'
  | 'needs-review';

export type LegacyDataInventory = {
  sessions: {
    total: number;
    keywordCompatible: number;
    legacyNonKeyword: number;
    needsReview: number;
  };
  opportunities: {
    total: number;
  };
  credentials: {
    rows: number;
    dataForSeoConfiguredRows: number;
    legacyColumnsPresent: {
      geminiApiKey: boolean;
      scrapeCreatorsApiKey: boolean;
    };
    legacyConfiguredRows: number;
    geminiConfiguredRows: number;
    scrapeCreatorsConfiguredRows: number;
  };
};

type ClassificationRow = {
  endpoint_selection: unknown;
  input_type: string;
  results: unknown;
};

type LegacyCredentialColumn = 'gemini_api_key' | 'scrapecreators_api_key';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function classifyAllowedArray(
  value: unknown,
  allowed: ReadonlySet<string>,
): 'allowed' | 'legacy' | 'review' {
  if (value === undefined) return 'allowed';
  if (!Array.isArray(value)) return 'review';
  if (!value.every((entry) => typeof entry === 'string')) return 'review';
  return value.some((entry) => !allowed.has(entry)) ? 'legacy' : 'allowed';
}

function classifyEndpointSelection(
  value: unknown,
): 'allowed' | 'legacy' | 'review' {
  if (value === null || value === undefined) return 'allowed';
  if (!isRecord(value)) return 'review';

  const providers = classifyAllowedArray(
    value.providers,
    new Set(['dataforseo']),
  );
  const sources = classifyAllowedArray(
    value.sources,
    new Set(['keywords', 'serp']),
  );
  if (providers === 'legacy' || sources === 'legacy') return 'legacy';
  if (providers === 'review' || sources === 'review') return 'review';

  if (value.category !== undefined) {
    if (typeof value.category !== 'string') return 'review';
    if (value.category !== 'seo') return 'legacy';
  }
  return 'allowed';
}

export function classifyLegacySession(
  row: ClassificationRow,
  allowedEndpointTypes: ReadonlySet<string>,
): LegacySessionClassification {
  if (row.input_type === 'topic' || row.input_type === 'domain') {
    return 'legacy-nonkeyword';
  }
  if (row.input_type !== 'keyword') return 'needs-review';

  const selection = classifyEndpointSelection(row.endpoint_selection);
  if (selection === 'legacy') return 'legacy-nonkeyword';
  if (selection === 'review') return 'needs-review';

  if (!Array.isArray(row.results) || row.results.length === 0) {
    return 'needs-review';
  }

  for (const result of row.results) {
    if (!isRecord(result) || typeof result.type !== 'string') {
      return 'needs-review';
    }
    if (!allowedEndpointTypes.has(result.type)) {
      return 'legacy-nonkeyword';
    }
  }

  return 'keyword-compatible';
}

async function canonicalSchemaPresent(sql: QuerySql): Promise<boolean> {
  const rows = await sql<Array<{ count: number }>>`
    select count(*)::int as count
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (
        'keyword_pro_api_credentials',
        'keyword_pro_research_sessions',
        'keyword_pro_research_opportunities'
      )
  `;
  return rows[0]?.count === 3;
}

async function credentialColumns(sql: QuerySql): Promise<Set<string>> {
  const rows = await sql<Array<{ column_name: string }>>`
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'keyword_pro_api_credentials'
  `;
  return new Set(rows.map((row) => row.column_name));
}

async function configuredCredentialCount(
  sql: QuerySql,
  column: LegacyCredentialColumn,
): Promise<number> {
  const rows = await sql<Array<{ count: number }>>`
    select count(*) filter (
      where ${sql(column)} is not null and btrim(${sql(column)}) <> ''
    )::int as count
    from public.keyword_pro_api_credentials
  `;
  return rows[0]?.count ?? 0;
}

async function legacyConfiguredRowCount(
  sql: QuerySql,
  columns: Set<string>,
): Promise<number> {
  const hasGemini = columns.has('gemini_api_key');
  const hasScrapeCreators = columns.has('scrapecreators_api_key');
  if (!hasGemini && !hasScrapeCreators) return 0;

  if (hasGemini && hasScrapeCreators) {
    const rows = await sql<Array<{ count: number }>>`
      select count(*) filter (
        where (gemini_api_key is not null and btrim(gemini_api_key) <> '')
          or (
            scrapecreators_api_key is not null
            and btrim(scrapecreators_api_key) <> ''
          )
      )::int as count
      from public.keyword_pro_api_credentials
    `;
    return rows[0]?.count ?? 0;
  }

  return configuredCredentialCount(
    sql,
    hasGemini ? 'gemini_api_key' : 'scrapecreators_api_key',
  );
}

export async function inventoryLegacyData(
  sql: QuerySql,
  allowedEndpointTypes: ReadonlySet<string>,
): Promise<LegacyDataInventory> {
  if (!(await canonicalSchemaPresent(sql))) {
    throw new Error('Canonical database schema is missing. Run pnpm db:migrate first.');
  }

  const [sessionRows, opportunityRows, credentialRows, columns] =
    await Promise.all([
      sql<ClassificationRow[]>`
        select input_type, endpoint_selection, results
        from public.keyword_pro_research_sessions
      `,
      sql<Array<{ count: number }>>`
        select count(*)::int as count
        from public.keyword_pro_research_opportunities
      `,
      sql<
        Array<{
          dataforseo_configured_rows: number;
          rows: number;
        }>
      >`
        select
          count(*)::int as rows,
          count(*) filter (
            where (
              dataforseo_login is not null and btrim(dataforseo_login) <> ''
            ) or (
              dataforseo_password is not null
              and btrim(dataforseo_password) <> ''
            )
          )::int as dataforseo_configured_rows
        from public.keyword_pro_api_credentials
      `,
      credentialColumns(sql),
    ]);

  const classifications = sessionRows.map((row) =>
    classifyLegacySession(row, allowedEndpointTypes),
  );
  const hasGemini = columns.has('gemini_api_key');
  const hasScrapeCreators = columns.has('scrapecreators_api_key');
  const [geminiConfigured, scrapeCreatorsConfigured, legacyConfigured] =
    await Promise.all([
      hasGemini ? configuredCredentialCount(sql, 'gemini_api_key') : 0,
      hasScrapeCreators
        ? configuredCredentialCount(sql, 'scrapecreators_api_key')
        : 0,
      legacyConfiguredRowCount(sql, columns),
    ]);

  return {
    sessions: {
      total: sessionRows.length,
      keywordCompatible: classifications.filter(
        (value) => value === 'keyword-compatible',
      ).length,
      legacyNonKeyword: classifications.filter(
        (value) => value === 'legacy-nonkeyword',
      ).length,
      needsReview: classifications.filter((value) => value === 'needs-review')
        .length,
    },
    opportunities: {
      total: opportunityRows[0]?.count ?? 0,
    },
    credentials: {
      rows: credentialRows[0]?.rows ?? 0,
      dataForSeoConfiguredRows:
        credentialRows[0]?.dataforseo_configured_rows ?? 0,
      legacyColumnsPresent: {
        geminiApiKey: hasGemini,
        scrapeCreatorsApiKey: hasScrapeCreators,
      },
      legacyConfiguredRows: legacyConfigured,
      geminiConfiguredRows: geminiConfigured,
      scrapeCreatorsConfiguredRows: scrapeCreatorsConfigured,
    },
  };
}

export function formatLegacyInventory(inventory: LegacyDataInventory): string {
  return [
    'Legacy compatibility inventory (counts only)',
    `Saved sessions: ${inventory.sessions.total}`,
    `  Keyword-compatible: ${inventory.sessions.keywordCompatible}`,
    `  Legacy non-keyword: ${inventory.sessions.legacyNonKeyword}`,
    `  Needs review: ${inventory.sessions.needsReview}`,
    `Saved opportunities: ${inventory.opportunities.total}`,
    `Credential rows: ${inventory.credentials.rows}`,
    `  Current DataForSEO configured: ${inventory.credentials.dataForSeoConfiguredRows}`,
    `  Legacy credential rows configured: ${inventory.credentials.legacyConfiguredRows}`,
    `  Gemini legacy column present: ${inventory.credentials.legacyColumnsPresent.geminiApiKey}`,
    `  Gemini legacy values configured: ${inventory.credentials.geminiConfiguredRows}`,
    `  ScrapeCreators legacy column present: ${inventory.credentials.legacyColumnsPresent.scrapeCreatorsApiKey}`,
    `  ScrapeCreators legacy values configured: ${inventory.credentials.scrapeCreatorsConfiguredRows}`,
    'No record identifiers, cached payloads, or encrypted values were printed.',
  ].join('\n');
}

async function legacyCredentialRows(
  sql: QuerySql,
  columns: Set<string>,
): Promise<ReadonlyArray<unknown>> {
  const hasGemini = columns.has('gemini_api_key');
  const hasScrapeCreators = columns.has('scrapecreators_api_key');
  if (!hasGemini && !hasScrapeCreators) return [];

  if (hasGemini && hasScrapeCreators) {
    return sql`
      select user_id, gemini_api_key, scrapecreators_api_key
      from public.keyword_pro_api_credentials
      where (gemini_api_key is not null and btrim(gemini_api_key) <> '')
        or (
          scrapecreators_api_key is not null
          and btrim(scrapecreators_api_key) <> ''
        )
      order by user_id
    `;
  }
  if (hasGemini) {
    return sql`
      select user_id, gemini_api_key
      from public.keyword_pro_api_credentials
      where gemini_api_key is not null and btrim(gemini_api_key) <> ''
      order by user_id
    `;
  }
  return sql`
    select user_id, scrapecreators_api_key
    from public.keyword_pro_api_credentials
    where scrapecreators_api_key is not null
      and btrim(scrapecreators_api_key) <> ''
    order by user_id
  `;
}

async function exportDestination(
  outputPath: string,
  repositoryRoot: string,
): Promise<string> {
  if (!outputPath.trim()) throw new Error('An explicit output path is required.');

  const requested = resolve(outputPath);
  const parent = await realpath(dirname(requested)).catch(() => null);
  if (!parent) {
    throw new Error('The export parent directory does not exist.');
  }
  const repository = await realpath(repositoryRoot);
  const destination = resolve(parent, basename(requested));
  const fromRepository = relative(repository, destination);
  const insideRepository =
    fromRepository === '' ||
    (!fromRepository.startsWith(`..${sep}`) &&
      fromRepository !== '..' &&
      !isAbsolute(fromRepository));
  if (insideRepository) {
    throw new Error('Refusing to write a private data export inside the repository.');
  }
  return destination;
}

export type LegacyDataExportResult = {
  bytes: number;
  filename: string;
  inventory: LegacyDataInventory;
  sha256: string;
};

export async function exportLegacyData(options: {
  allowedEndpointTypes: ReadonlySet<string>;
  now?: Date;
  outputPath: string;
  repositoryRoot: string;
  sql: Sql;
}): Promise<LegacyDataExportResult> {
  const destination = await exportDestination(
    options.outputPath,
    options.repositoryRoot,
  );
  const snapshot = await options.sql.begin(async (transaction) => {
    await transaction.unsafe(
      'SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY',
    );
    const inventory = await inventoryLegacyData(
      transaction,
      options.allowedEndpointTypes,
    );
    const columns = await credentialColumns(transaction);
    const [credentials, sessions, opportunities] = await Promise.all([
      legacyCredentialRows(transaction, columns),
      transaction`
        select id, user_id, title, input, input_type, primary_tab, filters,
          endpoint_selection, status, source, summary, results, is_pinned,
          pinned_order, created_at, updated_at
        from public.keyword_pro_research_sessions
        order by created_at, id
      `,
      transaction`
        select id, research_session_id, rank, title, intent, search_volume,
          keyword_difficulty, cpc, source_tab, meta, created_at
        from public.keyword_pro_research_opportunities
        order by research_session_id, rank, id
      `,
    ]);
    return { credentials, inventory, opportunities, sessions };
  });

  const payload = `${JSON.stringify(
    {
      format: 'keyword-pro-legacy-compatibility-export',
      version: 1,
      createdAt: (options.now ?? new Date()).toISOString(),
      warning:
        'Private data. Contains encrypted credentials and cached provider responses. Do not commit or share.',
      inventory: snapshot.inventory,
      legacyCredentials: snapshot.credentials,
      savedSessions: snapshot.sessions,
      savedOpportunities: snapshot.opportunities,
    },
    null,
    2,
  )}\n`;

  let created = false;
  try {
    await writeFile(destination, payload, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    created = true;
    await chmod(destination, 0o600);
  } catch (error) {
    if (created) await unlink(destination).catch(() => undefined);
    if (
      error instanceof Error &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'EEXIST'
    ) {
      throw new Error('Refusing to overwrite an existing export file.');
    }
    throw error;
  }

  return {
    bytes: Buffer.byteLength(payload),
    filename: basename(destination),
    inventory: snapshot.inventory,
    sha256: createHash('sha256').update(payload).digest('hex'),
  };
}

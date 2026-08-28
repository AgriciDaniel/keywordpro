CREATE OR REPLACE FUNCTION pg_temp.keyword_pro_table(name text)
RETURNS regclass
LANGUAGE sql
AS $$
  SELECT to_regclass(format('public.%I', name));
$$;

CREATE OR REPLACE FUNCTION pg_temp.keyword_pro_constraint_columns(
  constraint_oid oid,
  referenced boolean DEFAULT false
)
RETURNS text[]
LANGUAGE sql
AS $$
  SELECT ARRAY(
    SELECT attribute.attname
    FROM pg_constraint AS constraint_row
    CROSS JOIN LATERAL unnest(
      CASE
        WHEN referenced THEN constraint_row.confkey
        ELSE constraint_row.conkey
      END
    ) WITH ORDINALITY AS key_column(attnum, position)
    JOIN pg_attribute AS attribute
      ON attribute.attrelid = CASE
        WHEN referenced THEN constraint_row.confrelid
        ELSE constraint_row.conrelid
      END
      AND attribute.attnum = key_column.attnum
    WHERE constraint_row.oid = constraint_oid
    ORDER BY key_column.position
  );
$$;

CREATE OR REPLACE FUNCTION pg_temp.keyword_pro_rename_primary_key(
  table_name text,
  expected_name text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  current_name text;
  match_count integer;
  table_oid regclass := pg_temp.keyword_pro_table(table_name);
BEGIN
  SELECT count(*), min(constraint_row.conname)
    INTO match_count, current_name
  FROM pg_constraint AS constraint_row
  WHERE constraint_row.conrelid = table_oid
    AND constraint_row.contype = 'p';

  IF match_count <> 1 THEN
    RAISE EXCEPTION '% must have exactly one primary key, found %',
      table_name, match_count;
  END IF;

  IF current_name <> expected_name THEN
    EXECUTE format(
      'ALTER TABLE public.%I RENAME CONSTRAINT %I TO %I',
      table_name,
      current_name,
      expected_name
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.keyword_pro_rename_check(
  table_name text,
  column_name text,
  expected_name text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  current_name text;
  match_count integer;
  table_oid regclass := pg_temp.keyword_pro_table(table_name);
BEGIN
  SELECT count(*), min(constraint_row.conname)
    INTO match_count, current_name
  FROM pg_constraint AS constraint_row
  WHERE constraint_row.conrelid = table_oid
    AND constraint_row.contype = 'c'
    AND pg_temp.keyword_pro_constraint_columns(constraint_row.oid) = ARRAY[column_name];

  IF match_count <> 1 THEN
    RAISE EXCEPTION '% must have exactly one check on %, found %',
      table_name, column_name, match_count;
  END IF;

  IF current_name <> expected_name THEN
    EXECUTE format(
      'ALTER TABLE public.%I RENAME CONSTRAINT %I TO %I',
      table_name,
      current_name,
      expected_name
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.keyword_pro_rename_foreign_key(
  table_name text,
  columns text[],
  referenced_table text,
  referenced_columns text[],
  expected_name text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  current_name text;
  match_count integer;
  table_oid regclass := pg_temp.keyword_pro_table(table_name);
  referenced_oid regclass := pg_temp.keyword_pro_table(referenced_table);
BEGIN
  SELECT count(*), min(constraint_row.conname)
    INTO match_count, current_name
  FROM pg_constraint AS constraint_row
  WHERE constraint_row.conrelid = table_oid
    AND constraint_row.confrelid = referenced_oid
    AND constraint_row.contype = 'f'
    AND constraint_row.confdeltype = 'c'
    AND pg_temp.keyword_pro_constraint_columns(constraint_row.oid) = columns
    AND pg_temp.keyword_pro_constraint_columns(constraint_row.oid, true) =
      referenced_columns;

  IF match_count <> 1 THEN
    RAISE EXCEPTION '% must have exactly one cascading foreign key from % to %.%, found %',
      table_name,
      array_to_string(columns, ','),
      referenced_table,
      array_to_string(referenced_columns, ','),
      match_count;
  END IF;

  IF current_name <> expected_name THEN
    EXECUTE format(
      'ALTER TABLE public.%I RENAME CONSTRAINT %I TO %I',
      table_name,
      current_name,
      expected_name
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.keyword_pro_index_columns(index_oid oid)
RETURNS text[]
LANGUAGE sql
AS $$
  SELECT ARRAY(
    SELECT attribute.attname
    FROM pg_index AS index_row
    CROSS JOIN LATERAL unnest(index_row.indkey)
      WITH ORDINALITY AS key_column(attnum, position)
    JOIN pg_attribute AS attribute
      ON attribute.attrelid = index_row.indrelid
      AND attribute.attnum = key_column.attnum
    WHERE index_row.indexrelid = index_oid
      AND key_column.position <= index_row.indnkeyatts
    ORDER BY key_column.position
  );
$$;

CREATE OR REPLACE FUNCTION pg_temp.keyword_pro_rename_index(
  table_name text,
  columns text[],
  expected_name text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  current_name text;
  match_count integer;
  table_oid regclass := pg_temp.keyword_pro_table(table_name);
BEGIN
  SELECT count(*), min(index_class.relname)
    INTO match_count, current_name
  FROM pg_index AS index_row
  JOIN pg_class AS index_class ON index_class.oid = index_row.indexrelid
  WHERE index_row.indrelid = table_oid
    AND NOT index_row.indisprimary
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint AS constraint_row
      WHERE constraint_row.conindid = index_row.indexrelid
    )
    AND pg_temp.keyword_pro_index_columns(index_row.indexrelid) = columns;

  IF match_count <> 1 THEN
    RAISE EXCEPTION '% must have exactly one index on %, found %',
      table_name, array_to_string(columns, ','), match_count;
  END IF;

  IF current_name <> expected_name THEN
    EXECUTE format(
      'ALTER INDEX public.%I RENAME TO %I',
      current_name,
      expected_name
    );
  END IF;
END;
$$;

DO $keyword_pro_migration$
DECLARE
  old_count integer;
  canonical_count integer;
BEGIN
  SELECT count(*) INTO old_count
  FROM unnest(ARRAY[
    'rankenstein_user_settings',
    'rankenstein_api_credentials',
    'rankenstein_research_sessions',
    'rankenstein_research_opportunities'
  ]) AS table_name
  WHERE pg_temp.keyword_pro_table(table_name) IS NOT NULL;

  SELECT count(*) INTO canonical_count
  FROM unnest(ARRAY[
    'keyword_pro_user_settings',
    'keyword_pro_api_credentials',
    'keyword_pro_research_sessions',
    'keyword_pro_research_opportunities'
  ]) AS table_name
  WHERE pg_temp.keyword_pro_table(table_name) IS NOT NULL;

  IF old_count = 4 AND canonical_count = 0 THEN
    ALTER TABLE public.rankenstein_user_settings
      RENAME TO keyword_pro_user_settings;
    ALTER TABLE public.rankenstein_api_credentials
      RENAME TO keyword_pro_api_credentials;
    ALTER TABLE public.rankenstein_research_sessions
      RENAME TO keyword_pro_research_sessions;
    ALTER TABLE public.rankenstein_research_opportunities
      RENAME TO keyword_pro_research_opportunities;
  ELSIF old_count = 0 AND canonical_count = 0 THEN
    CREATE TABLE IF NOT EXISTS public."user" (
      id text CONSTRAINT user_pkey PRIMARY KEY,
      name text NOT NULL,
      email text NOT NULL CONSTRAINT user_email_unique UNIQUE,
      image text,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );

    CREATE TABLE public.keyword_pro_user_settings (
      user_id text CONSTRAINT keyword_pro_user_settings_pkey PRIMARY KEY,
      display_name text,
      bio text,
      avatar_url text,
      preset_avatar text,
      time_zone text,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now(),
      CONSTRAINT keyword_pro_user_settings_user_id_user_id_fk
        FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE
    );

    CREATE TABLE public.keyword_pro_api_credentials (
      user_id text CONSTRAINT keyword_pro_api_credentials_pkey PRIMARY KEY,
      dataforseo_login text,
      dataforseo_password text,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now(),
      CONSTRAINT keyword_pro_api_credentials_user_id_user_id_fk
        FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE
    );

    CREATE TABLE public.keyword_pro_research_sessions (
      id text CONSTRAINT keyword_pro_research_sessions_pkey PRIMARY KEY,
      user_id text NOT NULL,
      title text NOT NULL,
      input text NOT NULL,
      input_type text NOT NULL,
      primary_tab text NOT NULL,
      filters jsonb NOT NULL,
      endpoint_selection jsonb,
      status text NOT NULL DEFAULT 'completed',
      source text NOT NULL DEFAULT 'live',
      summary text,
      results jsonb,
      is_pinned integer NOT NULL DEFAULT 0,
      pinned_order integer,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now(),
      CONSTRAINT keyword_pro_research_sessions_user_id_user_id_fk
        FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE,
      CONSTRAINT keyword_pro_research_sessions_input_type_check
        CHECK (input_type IN ('topic', 'keyword', 'domain')),
      CONSTRAINT keyword_pro_research_sessions_status_check
        CHECK (status IN ('running', 'completed', 'failed')),
      CONSTRAINT keyword_pro_research_sessions_source_check
        CHECK (source IN ('live', 'mock', 'hybrid'))
    );

    CREATE TABLE public.keyword_pro_research_opportunities (
      id text CONSTRAINT keyword_pro_research_opportunities_pkey PRIMARY KEY,
      research_session_id text NOT NULL,
      rank integer NOT NULL,
      title text NOT NULL,
      intent text NOT NULL,
      search_volume integer,
      keyword_difficulty integer,
      cpc numeric(8, 2),
      source_tab text NOT NULL,
      meta jsonb,
      created_at timestamp NOT NULL DEFAULT now(),
      CONSTRAINT keyword_pro_research_opportunities_research_session_id_fk
        FOREIGN KEY (research_session_id)
        REFERENCES public.keyword_pro_research_sessions(id)
        ON DELETE CASCADE
    );

    CREATE INDEX keyword_pro_research_sessions_user_created_idx
      ON public.keyword_pro_research_sessions (user_id, created_at);
    CREATE INDEX keyword_pro_research_sessions_pinned_idx
      ON public.keyword_pro_research_sessions (user_id, is_pinned);
    CREATE INDEX keyword_pro_research_sessions_pinned_order_idx
      ON public.keyword_pro_research_sessions
      (user_id, is_pinned, pinned_order);
    CREATE INDEX keyword_pro_research_opportunities_session_idx
      ON public.keyword_pro_research_opportunities (research_session_id, rank);
  ELSIF old_count <> 0 OR canonical_count <> 4 THEN
    RAISE EXCEPTION
      'Ambiguous Keyword Pro schema state: found % legacy tables and % canonical tables. Expected 4/0, 0/4, or 0/0.',
      old_count,
      canonical_count;
  END IF;
END;
$keyword_pro_migration$;

SELECT pg_temp.keyword_pro_rename_primary_key(
  'keyword_pro_user_settings',
  'keyword_pro_user_settings_pkey'
);
SELECT pg_temp.keyword_pro_rename_primary_key(
  'keyword_pro_api_credentials',
  'keyword_pro_api_credentials_pkey'
);
SELECT pg_temp.keyword_pro_rename_primary_key(
  'keyword_pro_research_sessions',
  'keyword_pro_research_sessions_pkey'
);
SELECT pg_temp.keyword_pro_rename_primary_key(
  'keyword_pro_research_opportunities',
  'keyword_pro_research_opportunities_pkey'
);

SELECT pg_temp.keyword_pro_rename_foreign_key(
  'keyword_pro_user_settings',
  ARRAY['user_id'],
  'user',
  ARRAY['id'],
  'keyword_pro_user_settings_user_id_user_id_fk'
);
SELECT pg_temp.keyword_pro_rename_foreign_key(
  'keyword_pro_api_credentials',
  ARRAY['user_id'],
  'user',
  ARRAY['id'],
  'keyword_pro_api_credentials_user_id_user_id_fk'
);
SELECT pg_temp.keyword_pro_rename_foreign_key(
  'keyword_pro_research_sessions',
  ARRAY['user_id'],
  'user',
  ARRAY['id'],
  'keyword_pro_research_sessions_user_id_user_id_fk'
);
SELECT pg_temp.keyword_pro_rename_foreign_key(
  'keyword_pro_research_opportunities',
  ARRAY['research_session_id'],
  'keyword_pro_research_sessions',
  ARRAY['id'],
  'keyword_pro_research_opportunities_research_session_id_fk'
);

SELECT pg_temp.keyword_pro_rename_check(
  'keyword_pro_research_sessions',
  'input_type',
  'keyword_pro_research_sessions_input_type_check'
);
SELECT pg_temp.keyword_pro_rename_check(
  'keyword_pro_research_sessions',
  'status',
  'keyword_pro_research_sessions_status_check'
);
SELECT pg_temp.keyword_pro_rename_check(
  'keyword_pro_research_sessions',
  'source',
  'keyword_pro_research_sessions_source_check'
);

SELECT pg_temp.keyword_pro_rename_index(
  'keyword_pro_research_sessions',
  ARRAY['user_id', 'created_at'],
  'keyword_pro_research_sessions_user_created_idx'
);
SELECT pg_temp.keyword_pro_rename_index(
  'keyword_pro_research_sessions',
  ARRAY['user_id', 'is_pinned'],
  'keyword_pro_research_sessions_pinned_idx'
);
SELECT pg_temp.keyword_pro_rename_index(
  'keyword_pro_research_sessions',
  ARRAY['user_id', 'is_pinned', 'pinned_order'],
  'keyword_pro_research_sessions_pinned_order_idx'
);
SELECT pg_temp.keyword_pro_rename_index(
  'keyword_pro_research_opportunities',
  ARRAY['research_session_id', 'rank'],
  'keyword_pro_research_opportunities_session_idx'
);

DO $keyword_pro_verify$
DECLARE
  old_count integer;
  canonical_count integer;
BEGIN
  SELECT count(*) INTO old_count
  FROM unnest(ARRAY[
    'rankenstein_user_settings',
    'rankenstein_api_credentials',
    'rankenstein_research_sessions',
    'rankenstein_research_opportunities'
  ]) AS table_name
  WHERE pg_temp.keyword_pro_table(table_name) IS NOT NULL;

  SELECT count(*) INTO canonical_count
  FROM unnest(ARRAY[
    'keyword_pro_user_settings',
    'keyword_pro_api_credentials',
    'keyword_pro_research_sessions',
    'keyword_pro_research_opportunities'
  ]) AS table_name
  WHERE pg_temp.keyword_pro_table(table_name) IS NOT NULL;

  IF old_count <> 0 OR canonical_count <> 4 THEN
    RAISE EXCEPTION
      'Keyword Pro migration verification failed: % legacy tables and % canonical tables remain.',
      old_count,
      canonical_count;
  END IF;
END;
$keyword_pro_verify$;

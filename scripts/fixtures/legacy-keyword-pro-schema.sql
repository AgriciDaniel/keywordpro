CREATE TABLE public."user" (
  id text CONSTRAINT user_pkey PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL CONSTRAINT user_email_unique UNIQUE,
  image text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE public.rankenstein_user_settings (
  user_id text CONSTRAINT rankenstein_user_settings_pkey PRIMARY KEY,
  display_name text,
  bio text,
  avatar_url text,
  preset_avatar text,
  time_zone text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT rankenstein_user_settings_user_id_user_id_fk
    FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE
);

CREATE TABLE public.rankenstein_api_credentials (
  user_id text CONSTRAINT rankenstein_api_credentials_pkey PRIMARY KEY,
  gemini_api_key text,
  scrapecreators_api_key text,
  dataforseo_login text,
  dataforseo_password text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT rankenstein_api_credentials_user_id_user_id_fk
    FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE
);

CREATE TABLE public.rankenstein_research_sessions (
  id text CONSTRAINT rankenstein_research_sessions_pkey PRIMARY KEY,
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
  CONSTRAINT rankenstein_research_sessions_user_id_user_id_fk
    FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE,
  CONSTRAINT rankenstein_research_sessions_input_type_check
    CHECK (input_type IN ('topic', 'keyword', 'domain')),
  CONSTRAINT rankenstein_research_sessions_status_check
    CHECK (status IN ('running', 'completed', 'failed')),
  CONSTRAINT rankenstein_research_sessions_source_check
    CHECK (source IN ('live', 'mock', 'hybrid'))
);

CREATE TABLE public.rankenstein_research_opportunities (
  id text CONSTRAINT rankenstein_research_opportunities_pkey PRIMARY KEY,
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
  CONSTRAINT rankenstein_research_opportunities_session_id_fk
    FOREIGN KEY (research_session_id)
    REFERENCES public.rankenstein_research_sessions(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_research_sessions_user_created
  ON public.rankenstein_research_sessions (user_id, created_at);
CREATE INDEX rankenstein_research_sessions_pinned_idx
  ON public.rankenstein_research_sessions (user_id, is_pinned);
CREATE INDEX rankenstein_research_sessions_pinned_order_idx
  ON public.rankenstein_research_sessions
  (user_id, is_pinned, pinned_order);
CREATE INDEX idx_research_opps_session
  ON public.rankenstein_research_opportunities (research_session_id, rank);

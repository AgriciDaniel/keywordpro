export type ResearchTab =
  | 'keywords'
  | 'serp'
  | 'questions'
  | 'clusters'
  | 'competitors';

export type ResearchMode = 'marketing' | 'article';

export type ResearchIntent =
  | 'listicle'
  | 'comparison'
  | 'informational'
  | 'commercial';

export type DeviceType = 'desktop' | 'mobile' | 'tablet';

export type SearchEngine = 'google' | 'bing' | 'duckduckgo';

export type ResearchInputType = 'topic' | 'keyword' | 'domain';

export type ResearchSessionStatus = 'running' | 'completed' | 'failed';

export type ResearchSource = 'live' | 'mock' | 'hybrid';

export type ResearchProvider = 'dataforseo';

export type ResearchSourceScope =
  | 'keywords'
  | 'serp';

export type ResearchOutputFormat =
  | 'dashboard'
  | 'table'
  | 'brief'
  | 'markdown'
  | 'json'
  | 'links';

export type ResearchCategory = 'seo';

export interface ResearchEndpointOptions {
  limit: number;
  freshness: 'any' | '24h' | '7d' | '30d';
  includePageContent: boolean;
  mainContentOnly: boolean;
  parsePdf: boolean;
  enhancedMode: boolean;
}

export interface ResearchEndpointSelection {
  providers: ResearchProvider[];
  sources: ResearchSourceScope[];
  format: ResearchOutputFormat;
  category: ResearchCategory;
  options: ResearchEndpointOptions;
}

export interface ResearchFilters {
  location: string;
  language: string;
  device: DeviceType;
  searchEngine: SearchEngine;
}

export interface ResearchOpportunity {
  id: string;
  rank: number;
  title: string;
  intent: ResearchIntent;
  searchVolume: number | null;
  keywordDifficulty: number | null;
  cpc: number | null;
  sourceTab: ResearchTab;
  meta?: {
    relatedKeywords?: string[];
    serpFeatures?: string[];
    competitorDomains?: string[];
  };
}

export interface ResearchConsoleRequest {
  mode: ResearchMode;
  tab: ResearchTab;
  input: string;
  inputType?: ResearchInputType;
  filters: ResearchFilters;
  endpointSelection?: ResearchEndpointSelection;
  projectId?: string;
  researchSessionId?: string;
  articleId?: string;
}

export interface ResearchSessionSummary {
  id: string;
  title: string;
  primaryTab: ResearchTab;
  status: ResearchSessionStatus;
  isPinned: boolean;
  pinnedOrder: number | null;
  topOpportunityTitle?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchRunResult {
  type: string;
  label: string;
  response: unknown;
  error: string | null;
}

export interface ResearchSessionDetail extends ResearchSessionSummary {
  /** Cached endpoint responses, so reopening a saved search costs nothing. */
  results?: ResearchRunResult[];
  input: string;
  inputType: 'topic' | 'keyword' | 'domain';
  filters: ResearchFilters;
  endpointSelection?: ResearchEndpointSelection;
  source: ResearchSource;
  summary?: string;
  opportunities: ResearchOpportunity[];
}

export interface ResearchConsoleResponse {
  request: ResearchConsoleRequest;
  generatedAt: string;
  source: ResearchSource;
  opportunities: ResearchOpportunity[];
  summary?: string;
  warnings?: string[];
}

export const RESEARCH_TABS: ResearchTab[] = [
  'keywords',
  'serp',
  'questions',
  'clusters',
  'competitors',
];

export const DEFAULT_RESEARCH_FILTERS: ResearchFilters = {
  location: 'US',
  language: 'en',
  device: 'desktop',
  searchEngine: 'google',
};

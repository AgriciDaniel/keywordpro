/*
 * SPDX-License-Identifier: Apache-2.0
 */

import type { EndpointInput } from '@/lib/research/types';

export type ResearchModuleId = 'K1';

export type ResearchModuleEndpoint = {
  endpointId: string;
  required: boolean;
  sectionId: string;
  sectionTitle: string;
  buildParams: (input: EndpointInput) => EndpointInput;
};

export type ResearchModuleDef = {
  id: ResearchModuleId;
  title: string;
  endpoints: ResearchModuleEndpoint[];
};

function keywordParams(input: EndpointInput): EndpointInput {
  const keyword = input.keyword ?? input.query;
  const country = input.country ?? 'United States';
  const language = input.language ?? 'English';
  return {
    country,
    depth: input.depth,
    keyword,
    keywords: Array.isArray(input.keywords) ? input.keywords : [keyword],
    language,
    language_code: input.language_code ?? 'en',
    limit: input.limit ?? 100,
    location_code: input.location_code ?? 2840,
  };
}

export const RESEARCH_MODULES: Record<ResearchModuleId, ResearchModuleDef> = {
  K1: {
    id: 'K1',
    title: 'Keyword Opportunity Scan',
    endpoints: [
      {
        endpointId: 'labs.google.related_keywords.live',
        required: true,
        sectionId: 'related-keywords',
        sectionTitle: 'Related keywords',
        buildParams: keywordParams,
      },
      {
        endpointId: 'keyword.google_ads.search_volume.live',
        required: true,
        sectionId: 'search-volume',
        sectionTitle: 'Search volume',
        buildParams: keywordParams,
      },
      {
        endpointId: 'labs.google.keyword_overview.live',
        required: true,
        sectionId: 'keyword-overview',
        sectionTitle: 'Keyword overview',
        buildParams: keywordParams,
      },
      {
        endpointId: 'labs.google.search_intent.live',
        required: true,
        sectionId: 'search-intent',
        sectionTitle: 'Search intent',
        buildParams: keywordParams,
      },
    ],
  },
};

export function getResearchModule(id: string): ResearchModuleDef | null {
  return RESEARCH_MODULES[id as ResearchModuleId] ?? null;
}

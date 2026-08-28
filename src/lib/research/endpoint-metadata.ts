/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * Auto-generated sanitized UI metadata from src/lib/research/endpoints.ts.
 * Do not add executable endpoint builders or projectors here.
 */

import type { EndpointCategory, EndpointMethod, EndpointProvider } from './types';

export type EndpointMetadata = {
  api: EndpointProvider;
  category: EndpointCategory;
  description: string;
  method: EndpointMethod;
  optional: string[];
  required: string[];
  stub: boolean;
  type: string;
};

export const ENDPOINT_METADATA =[
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "DataForSEO endpoint ai_optimization/ai_keyword_data/available_filters (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ai.ai_keyword_data.available_filters"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "DataForSEO endpoint ai_optimization/ai_keyword_data/locations_and_languages (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ai.ai_keyword_data.locations_and_languages"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "Search volume specifically across AI search engines.",
    "method": "POST",
    "optional": [],
    "required": [
      "keywords"
    ],
    "stub": false,
    "type": "ai.ai_keyword_data.search_volume.live"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "Ask ChatGPT a question via DataForSEO and get the response with citations.",
    "method": "POST",
    "optional": [],
    "required": [
      "prompt"
    ],
    "stub": false,
    "type": "ai.chat_gpt.llm_responses.live"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "DataForSEO endpoint ai_optimization/chat_gpt/llm_responses/task_get (GET).",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "ai.chat_gpt.llm_responses.task_get"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "Submit async ChatGPT query task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ai.chat_gpt.llm_responses.task_post"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "List async tasks that are ready to be fetched for ai.chat_gpt.llm_responses.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ai.chat_gpt.llm_responses.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "DataForSEO endpoint ai_optimization/chat_gpt/llm_scraper/languages (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ai.chat_gpt.llm_scraper.languages"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "Scrape ChatGPT search results for a keyword.",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword"
    ],
    "stub": false,
    "type": "ai.chat_gpt.llm_scraper.live"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "Scrape ChatGPT search results for a keyword. (raw HTML response).",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword"
    ],
    "stub": false,
    "type": "ai.chat_gpt.llm_scraper.live.html"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "DataForSEO endpoint ai_optimization/chat_gpt/llm_scraper/locations (GET).",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "ai.chat_gpt.llm_scraper.locations"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "Fetch advanced results for a previously submitted ai.chat_gpt.llm_scraper task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "ai.chat_gpt.llm_scraper.task_get.advanced"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "Fetch raw HTML results for a previously submitted ai.chat_gpt.llm_scraper task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "ai.chat_gpt.llm_scraper.task_get.html"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "Submit async ChatGPT scraper task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ai.chat_gpt.llm_scraper.task_post"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "List async tasks that are ready to be fetched for ai.chat_gpt.llm_scraper.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ai.chat_gpt.llm_scraper.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "Ask Claude a question via DataForSEO and get the response with citations.",
    "method": "POST",
    "optional": [],
    "required": [
      "prompt"
    ],
    "stub": false,
    "type": "ai.claude.llm_responses.live"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "DataForSEO endpoint ai_optimization/claude/llm_responses/task_get (GET).",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "ai.claude.llm_responses.task_get"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "Submit async Claude query task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ai.claude.llm_responses.task_post"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "List async tasks that are ready to be fetched for ai.claude.llm_responses.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ai.claude.llm_responses.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "Ask Gemini a question via DataForSEO and get the response with citations.",
    "method": "POST",
    "optional": [],
    "required": [
      "prompt"
    ],
    "stub": false,
    "type": "ai.gemini.llm_responses.live"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "DataForSEO endpoint ai_optimization/gemini/llm_responses/task_get (GET).",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "ai.gemini.llm_responses.task_get"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "Submit async Gemini query task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ai.gemini.llm_responses.task_post"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "List async tasks that are ready to be fetched for ai.gemini.llm_responses.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ai.gemini.llm_responses.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "DataForSEO endpoint ai_optimization/gemini/llm_scraper/languages (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ai.gemini.llm_scraper.languages"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "Scrape Gemini search results for a keyword.",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword"
    ],
    "stub": false,
    "type": "ai.gemini.llm_scraper.live"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "Scrape Gemini search results for a keyword. (raw HTML response).",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword"
    ],
    "stub": false,
    "type": "ai.gemini.llm_scraper.live.html"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "DataForSEO endpoint ai_optimization/gemini/llm_scraper/locations (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ai.gemini.llm_scraper.locations"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "Fetch advanced results for a previously submitted ai.gemini.llm_scraper task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "ai.gemini.llm_scraper.task_get.advanced"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "Fetch raw HTML results for a previously submitted ai.gemini.llm_scraper task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "ai.gemini.llm_scraper.task_get.html"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "Submit async Gemini scraper task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ai.gemini.llm_scraper.task_post"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "List async tasks that are ready to be fetched for ai.gemini.llm_scraper.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ai.gemini.llm_scraper.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "Aggregated mention metrics over time.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": true,
    "type": "ai.llm_mentions.aggregated_metrics.live"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "DataForSEO endpoint ai_optimization/llm_mentions/available_filters (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ai.llm_mentions.available_filters"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "Cross-LLM aggregated metrics.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": true,
    "type": "ai.llm_mentions.cross_aggregated_metrics.live"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "DataForSEO endpoint ai_optimization/llm_mentions/locations_and_languages (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ai.llm_mentions.locations_and_languages"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "Search LLM responses for brand/topic mentions.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": true,
    "type": "ai.llm_mentions.search.live"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "Top cited domains in LLM responses.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": true,
    "type": "ai.llm_mentions.top_domains.live"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "Top cited pages in LLM responses.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": true,
    "type": "ai.llm_mentions.top_pages.live"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "Ask Perplexity a question via DataForSEO with citations.",
    "method": "POST",
    "optional": [],
    "required": [
      "prompt"
    ],
    "stub": false,
    "type": "ai.perplexity.llm_responses.live"
  },
  {
    "api": "dataforseo",
    "category": "content",
    "description": "DataForSEO endpoint content_analysis/available_filters (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "content.available_filters"
  },
  {
    "api": "dataforseo",
    "category": "content",
    "description": "Mention/discussion trend for a category.",
    "method": "POST",
    "optional": [],
    "required": [
      "category_code"
    ],
    "stub": false,
    "type": "content.category_trends.live"
  },
  {
    "api": "dataforseo",
    "category": "content",
    "description": "DataForSEO endpoint content_analysis/id_list (POST).",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "content.id_list"
  },
  {
    "api": "dataforseo",
    "category": "content",
    "description": "Phrase mention trend over a date range.",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword"
    ],
    "stub": false,
    "type": "content.phrase_trends.live"
  },
  {
    "api": "dataforseo",
    "category": "content",
    "description": "Distribution of ratings (1-5 star) across mentions.",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword"
    ],
    "stub": false,
    "type": "content.rating_distribution.live"
  },
  {
    "api": "dataforseo",
    "category": "content",
    "description": "Search content mentions across the web index.",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword"
    ],
    "stub": false,
    "type": "content.search.live"
  },
  {
    "api": "dataforseo",
    "category": "content",
    "description": "Sentiment analysis (positive/negative/neutral) across mentions.",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword"
    ],
    "stub": false,
    "type": "content.sentiment_analysis.live"
  },
  {
    "api": "dataforseo",
    "category": "content",
    "description": "Aggregated counts/metrics for a search query (mention volume).",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword"
    ],
    "stub": false,
    "type": "content.summary.live"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "DataForSEO endpoint keywords_data/bing/audience_estimation/industries (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "keyword.bing.audience_estimation.industries"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "DataForSEO endpoint keywords_data/bing/audience_estimation/job_functions (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "keyword.bing.audience_estimation.job_functions"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Bing Ads audience size estimation.",
    "method": "POST",
    "optional": [],
    "required": [
      "location_code"
    ],
    "stub": false,
    "type": "keyword.bing.audience_estimation.live"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "DataForSEO endpoint keywords_data/bing/audience_estimation/task_get (GET).",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "keyword.bing.audience_estimation.task_get"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Submit async audience-estimation task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "keyword.bing.audience_estimation.task_post"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "List async tasks that are ready to be fetched for keyword.bing.audience_estimation.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "keyword.bing.audience_estimation.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Bing Ads keyword performance estimate.",
    "method": "POST",
    "optional": [],
    "required": [
      "keywords"
    ],
    "stub": false,
    "type": "keyword.bing.keyword_performance.live"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "DataForSEO endpoint keywords_data/bing/keyword_performance/locations_and_languages (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "keyword.bing.keyword_performance.locations_and_languages"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "DataForSEO endpoint keywords_data/bing/keyword_performance/task_get (GET).",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "keyword.bing.keyword_performance.task_get"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Submit async Bing keyword performance task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "keyword.bing.keyword_performance.task_post"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "List async tasks that are ready to be fetched for keyword.bing.keyword_performance.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "keyword.bing.keyword_performance.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Bing Ads related keyword ideas.",
    "method": "POST",
    "optional": [],
    "required": [
      "keywords",
      "country",
      "language"
    ],
    "stub": false,
    "type": "keyword.bing.keywords_for_keywords.live"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "DataForSEO endpoint keywords_data/bing/keywords_for_keywords/task_get (GET).",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "keyword.bing.keywords_for_keywords.task_get"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Submit async Bing keywords-for-keywords task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "keyword.bing.keywords_for_keywords.task_post"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "List async tasks that are ready to be fetched for keyword.bing.keywords_for_keywords.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "keyword.bing.keywords_for_keywords.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "DataForSEO endpoint keywords_data/bing/keywords_for_site/task_get (GET).",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "keyword.bing.keywords_for_site.task_get"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Submit async Bing keywords-for-site task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "keyword.bing.keywords_for_site.task_post"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "List async tasks that are ready to be fetched for keyword.bing.keywords_for_site.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "keyword.bing.keywords_for_site.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Bing Ads historical search volume.",
    "method": "POST",
    "optional": [],
    "required": [
      "keywords"
    ],
    "stub": false,
    "type": "keyword.bing.search_volume_history.live"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "DataForSEO endpoint keywords_data/bing/search_volume_history/locations_and_languages (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "keyword.bing.search_volume_history.locations_and_languages"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "DataForSEO endpoint keywords_data/bing/search_volume_history/task_get (GET).",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "keyword.bing.search_volume_history.task_get"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Submit async Bing search volume history task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "keyword.bing.search_volume_history.task_post"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "List async tasks that are ready to be fetched for keyword.bing.search_volume_history.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "keyword.bing.search_volume_history.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Bing Ads keyword search volume.",
    "method": "POST",
    "optional": [],
    "required": [
      "keywords",
      "country",
      "language"
    ],
    "stub": false,
    "type": "keyword.bing.search_volume.live"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "DataForSEO endpoint keywords_data/bing/search_volume/task_get (GET).",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "keyword.bing.search_volume.task_get"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Submit async Bing search volume task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "keyword.bing.search_volume.task_post"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "List async tasks that are ready to be fetched for keyword.bing.search_volume.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "keyword.bing.search_volume.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Bulk clickstream search volume (high-throughput).",
    "method": "POST",
    "optional": [],
    "required": [
      "keywords"
    ],
    "stub": false,
    "type": "keyword.clickstream.bulk_search_volume.live"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Clickstream-derived search volume (more accurate than Google Ads).",
    "method": "POST",
    "optional": [],
    "required": [
      "keywords"
    ],
    "stub": false,
    "type": "keyword.clickstream.dataforseo_search_volume.live"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Global clickstream search volume across all countries.",
    "method": "POST",
    "optional": [],
    "required": [
      "keywords"
    ],
    "stub": false,
    "type": "keyword.clickstream.global_search_volume.live"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Trend interest by age/gender demographics.",
    "method": "POST",
    "optional": [],
    "required": [
      "keywords"
    ],
    "stub": false,
    "type": "keyword.dataforseo_trends.demography.live"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "DataForSEO trends explorer (proprietary clickstream-based).",
    "method": "POST",
    "optional": [],
    "required": [
      "keywords"
    ],
    "stub": false,
    "type": "keyword.dataforseo_trends.explore.live"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "DataForSEO endpoint keywords_data/dataforseo_trends/locations (GET).",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "keyword.dataforseo_trends.locations"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Merged trends data (explore + subregions + demography in one call).",
    "method": "POST",
    "optional": [],
    "required": [
      "keywords"
    ],
    "stub": false,
    "type": "keyword.dataforseo_trends.merged_data.live"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Trend interest broken down by subregion (state/province).",
    "method": "POST",
    "optional": [],
    "required": [
      "keywords"
    ],
    "stub": false,
    "type": "keyword.dataforseo_trends.subregion_interests.live"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "DataForSEO endpoint keywords_data/errors (POST).",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "keyword.errors"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Estimated ad traffic by keywords for a given bid.",
    "method": "POST",
    "optional": [],
    "required": [
      "keywords",
      "bid"
    ],
    "stub": false,
    "type": "keyword.google_ads.ad_traffic_by_keywords.live"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "DataForSEO endpoint keywords_data/google_ads/ad_traffic_by_keywords/task_get (GET).",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "keyword.google_ads.ad_traffic_by_keywords.task_get"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Submit async ad-traffic task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "keyword.google_ads.ad_traffic_by_keywords.task_post"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "List async tasks that are ready to be fetched for keyword.google_ads.ad_traffic_by_keywords.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "keyword.google_ads.ad_traffic_by_keywords.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Related keyword ideas from Google Ads.",
    "method": "POST",
    "optional": [],
    "required": [
      "keywords",
      "country",
      "language"
    ],
    "stub": false,
    "type": "keyword.google_ads.keywords_for_keywords.live"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "DataForSEO endpoint keywords_data/google_ads/keywords_for_keywords/task_get (GET).",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "keyword.google_ads.keywords_for_keywords.task_get"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Submit async keywords-for-keywords task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "keyword.google_ads.keywords_for_keywords.task_post"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "List async tasks that are ready to be fetched for keyword.google_ads.keywords_for_keywords.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "keyword.google_ads.keywords_for_keywords.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "DataForSEO endpoint keywords_data/google_ads/keywords_for_site/task_get (GET).",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "keyword.google_ads.keywords_for_site.task_get"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Submit async keywords-for-site task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "keyword.google_ads.keywords_for_site.task_post"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "List async tasks that are ready to be fetched for keyword.google_ads.keywords_for_site.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "keyword.google_ads.keywords_for_site.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Google Ads keyword search volume + CPC + competition.",
    "method": "POST",
    "optional": [],
    "required": [
      "keywords",
      "country",
      "language"
    ],
    "stub": false,
    "type": "keyword.google_ads.search_volume.live"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "DataForSEO endpoint keywords_data/google_ads/search_volume/task_get (GET).",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "keyword.google_ads.search_volume.task_get"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Submit async search volume task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "keyword.google_ads.search_volume.task_post"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "List async tasks that are ready to be fetched for keyword.google_ads.search_volume.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "keyword.google_ads.search_volume.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "DataForSEO endpoint keywords_data/google_ads/status (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "keyword.google_ads.status"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Google Trends interest over time + related queries.",
    "method": "POST",
    "optional": [],
    "required": [
      "keywords"
    ],
    "stub": false,
    "type": "keyword.google_trends.explore.live"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "DataForSEO endpoint keywords_data/google_trends/explore/task_get (GET).",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "keyword.google_trends.explore.task_get"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Submit async Google Trends explore task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "keyword.google_trends.explore.task_post"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "List async tasks that are ready to be fetched for keyword.google_trends.explore.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "keyword.google_trends.explore.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "DataForSEO endpoint keywords_data/google_trends/languages (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "keyword.google_trends.languages"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "DataForSEO endpoint keywords_data/id_list (POST).",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "keyword.id_list"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "Amazon keyword search volume.",
    "method": "POST",
    "optional": [],
    "required": [
      "keywords"
    ],
    "stub": false,
    "type": "labs.amazon.bulk_search_volume.live"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "Competing ASINs by keyword overlap.",
    "method": "POST",
    "optional": [],
    "required": [
      "asin"
    ],
    "stub": false,
    "type": "labs.amazon.product_competitors.live"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "Keywords for which multiple ASINs all rank.",
    "method": "POST",
    "optional": [],
    "required": [
      "asins"
    ],
    "stub": false,
    "type": "labs.amazon.product_keyword_intersections.live"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "ASIN ranking overview (positions histogram).",
    "method": "POST",
    "optional": [],
    "required": [
      "asins"
    ],
    "stub": false,
    "type": "labs.amazon.product_rank_overview.live"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "Amazon related-keyword suggestions.",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword"
    ],
    "stub": false,
    "type": "labs.amazon.related_keywords.live"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "Competing App Store apps by keyword overlap.",
    "method": "POST",
    "optional": [],
    "required": [
      "app_id"
    ],
    "stub": false,
    "type": "labs.apple.app_competitors.live"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "Keywords for which multiple App Store apps all rank.",
    "method": "POST",
    "optional": [],
    "required": [
      "app_ids"
    ],
    "stub": false,
    "type": "labs.apple.app_intersection.live"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "App Store app metrics.",
    "method": "POST",
    "optional": [],
    "required": [
      "app_ids"
    ],
    "stub": false,
    "type": "labs.apple.bulk_app_metrics.live"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "Keywords an App Store app ranks for.",
    "method": "POST",
    "optional": [],
    "required": [
      "app_id"
    ],
    "stub": false,
    "type": "labs.apple.keywords_for_app.live"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "DataForSEO endpoint dataforseo_labs/available_filters (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "labs.available_filters"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "DataForSEO endpoint dataforseo_labs/categories (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "labs.categories"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "DataForSEO endpoint dataforseo_labs/errors (POST).",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "labs.errors"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "Competing Google Play apps by keyword overlap.",
    "method": "POST",
    "optional": [],
    "required": [
      "app_id"
    ],
    "stub": false,
    "type": "labs.google_play.app_competitors.live"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "Keywords for which multiple Google Play apps all rank.",
    "method": "POST",
    "optional": [],
    "required": [
      "app_ids"
    ],
    "stub": false,
    "type": "labs.google_play.app_intersection.live"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "Google Play app metrics (rating, installs, keywords).",
    "method": "POST",
    "optional": [],
    "required": [
      "app_ids"
    ],
    "stub": false,
    "type": "labs.google_play.bulk_app_metrics.live"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "Keywords a Google Play app ranks for.",
    "method": "POST",
    "optional": [],
    "required": [
      "app_id"
    ],
    "stub": false,
    "type": "labs.google_play.keywords_for_app.live"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "DataForSEO endpoint dataforseo_labs/google/available_history (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "labs.google.available_history"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "Bulk keyword difficulty score (0-100).",
    "method": "POST",
    "optional": [],
    "required": [
      "keywords",
      "country",
      "language"
    ],
    "stub": false,
    "type": "labs.google.bulk_keyword_difficulty.live"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "Categories a domain ranks for.",
    "method": "POST",
    "optional": [],
    "required": [
      "target"
    ],
    "stub": false,
    "type": "labs.google.categories_for_domain.live"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "DataForSEO endpoint dataforseo_labs/google/categories_for_keywords/languages (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "labs.google.categories_for_keywords.languages"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "Categories that keywords belong to.",
    "method": "POST",
    "optional": [],
    "required": [
      "keywords"
    ],
    "stub": false,
    "type": "labs.google.categories_for_keywords.live"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "Historical monthly search volume per keyword.",
    "method": "POST",
    "optional": [],
    "required": [
      "keywords"
    ],
    "stub": false,
    "type": "labs.google.historical_keyword_data.live"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "Generate keyword ideas semantically related to seeds (long-tail).",
    "method": "POST",
    "optional": [],
    "required": [
      "keywords",
      "country",
      "language"
    ],
    "stub": false,
    "type": "labs.google.keyword_ideas.live"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "Full keyword overview: volume, CPC, difficulty, intent, trend.",
    "method": "POST",
    "optional": [],
    "required": [
      "keywords",
      "country",
      "language"
    ],
    "stub": false,
    "type": "labs.google.keyword_overview.live"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "Autocomplete-style keyword suggestions (alternatives).",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword",
      "country",
      "language"
    ],
    "stub": false,
    "type": "labs.google.keyword_suggestions.live"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "Top keywords for given category codes.",
    "method": "POST",
    "optional": [],
    "required": [
      "category_codes"
    ],
    "stub": false,
    "type": "labs.google.keywords_for_categories.live"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "DataForSEO endpoint dataforseo_labs/google/keywords_for_site/live (POST).",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "labs.google.keywords_for_site.live"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "Semantically related keywords + full keyword data.",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword",
      "country",
      "language"
    ],
    "stub": false,
    "type": "labs.google.related_keywords.live"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "Classify keyword search intent (informational/navigational/transactional).",
    "method": "POST",
    "optional": [],
    "required": [
      "keywords",
      "language"
    ],
    "stub": false,
    "type": "labs.google.search_intent.live"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "Domains competing in SERPs for given keywords.",
    "method": "POST",
    "optional": [],
    "required": [
      "keywords",
      "country",
      "language"
    ],
    "stub": false,
    "type": "labs.google.serp_competitors.live"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "Top trending searches in a location.",
    "method": "POST",
    "optional": [],
    "required": [
      "country"
    ],
    "stub": false,
    "type": "labs.google.top_searches.live"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "DataForSEO endpoint dataforseo_labs/id_list (POST).",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "labs.id_list"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "DataForSEO endpoint dataforseo_labs/status (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "labs.status"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "Available ChatGPT models.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ref.ai.chat_gpt.models"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "Available Claude models.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ref.ai.claude.models"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "Available Gemini models.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ref.ai.gemini.models"
  },
  {
    "api": "dataforseo",
    "category": "ai",
    "description": "Available Perplexity models.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ref.ai.perplexity.models"
  },
  {
    "api": "dataforseo",
    "category": "ref",
    "description": "Reference catalog of DFS API error codes.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ref.appendix.errors"
  },
  {
    "api": "dataforseo",
    "category": "ref",
    "description": "DataForSEO system status.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ref.appendix.status"
  },
  {
    "api": "dataforseo",
    "category": "ref",
    "description": "Current account info: balance, rate limits.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ref.appendix.user_data"
  },
  {
    "api": "dataforseo",
    "category": "ref",
    "description": "Webhook resend configuration / endpoint.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ref.appendix.webhook_resend"
  },
  {
    "api": "dataforseo",
    "category": "content",
    "description": "Content Analysis categories.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ref.content.categories"
  },
  {
    "api": "dataforseo",
    "category": "content",
    "description": "Content Analysis languages.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ref.content.languages"
  },
  {
    "api": "dataforseo",
    "category": "content",
    "description": "Content Analysis locations.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ref.content.locations"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Bing Ads languages.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ref.keyword.bing.languages"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Bing Ads locations.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ref.keyword.bing.locations"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Clickstream locations + languages.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ref.keyword.clickstream.locations_and_languages"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Google Ads languages.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ref.keyword.google_ads.languages"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Google Ads locations.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ref.keyword.google_ads.locations"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Google Trends categories.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ref.keyword.google_trends.categories"
  },
  {
    "api": "dataforseo",
    "category": "keyword",
    "description": "Google Trends locations.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ref.keyword.google_trends.locations"
  },
  {
    "api": "dataforseo",
    "category": "labs",
    "description": "DataForSEO Labs all locations + languages.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ref.labs.locations_and_languages"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "All Bing SERP supported locations.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ref.serp.bing.locations"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Recent SERP API errors for your account.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ref.serp.errors"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "All Google SERP supported languages.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ref.serp.google.languages"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "All Google SERP supported locations.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ref.serp.google.locations"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List of recent SERP task IDs.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ref.serp.id_list"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "All YouTube SERP supported locations.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "ref.serp.youtube.locations"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "AI-generated summary of a SERP result.",
    "method": "POST",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.ai_summary.live"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "DataForSEO endpoint serp/baidu/languages (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.baidu.languages"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "DataForSEO endpoint serp/baidu/locations (GET).",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.baidu.locations"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch advanced results for a previously submitted serp.baidu.organic task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.baidu.organic.task_get.advanced"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch raw HTML results for a previously submitted serp.baidu.organic task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.baidu.organic.task_get.html"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch regular (lighter) results for a previously submitted serp.baidu.organic task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.baidu.organic.task_get.regular"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Baidu organic SERP (Chinese; no live variant - task only).",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword"
    ],
    "stub": false,
    "type": "serp.baidu.organic.task_post"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that were repaired / retried for serp.baidu.organic.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.baidu.organic.tasks_fixed"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that are ready to be fetched for serp.baidu.organic.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.baidu.organic.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "DataForSEO endpoint serp/bing/languages (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.bing.languages"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Bing organic SERP results.",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword",
      "country",
      "language"
    ],
    "stub": false,
    "type": "serp.bing.organic.live"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Bing organic SERP results. (raw HTML response).",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword",
      "country",
      "language"
    ],
    "stub": false,
    "type": "serp.bing.organic.live.html"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Bing organic SERP results. (regular response format - lighter payload).",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword",
      "country",
      "language"
    ],
    "stub": false,
    "type": "serp.bing.organic.live.regular"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch advanced results for a previously submitted serp.bing.organic task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.bing.organic.task_get.advanced"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch raw HTML results for a previously submitted serp.bing.organic task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.bing.organic.task_get.html"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch regular (lighter) results for a previously submitted serp.bing.organic task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.bing.organic.task_get.regular"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Submit async Bing organic task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.bing.organic.task_post"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that were repaired / retried for serp.bing.organic.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.bing.organic.tasks_fixed"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that are ready to be fetched for serp.bing.organic.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.bing.organic.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "DataForSEO endpoint serp/google/ads_advertisers/locations (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.ads_advertisers.locations"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch advanced results for a previously submitted serp.google.ads_advertisers task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.google.ads_advertisers.task_get.advanced"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Submit async Ads Advertisers task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.ads_advertisers.task_post"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that are ready to be fetched for serp.google.ads_advertisers.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.ads_advertisers.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "DataForSEO endpoint serp/google/ads_search/locations (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.ads_search.locations"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch advanced results for a previously submitted serp.google.ads_search task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.google.ads_search.task_get.advanced"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Submit async Ads Search task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.ads_search.task_post"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that are ready to be fetched for serp.google.ads_search.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.ads_search.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "DataForSEO endpoint serp/google/ai_mode/languages (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.ai_mode.languages"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Google AI Mode answer with citations.",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword",
      "country",
      "language"
    ],
    "stub": false,
    "type": "serp.google.ai_mode.live"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Google AI Mode answer with citations. (raw HTML response).",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword",
      "country",
      "language"
    ],
    "stub": false,
    "type": "serp.google.ai_mode.live.html"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch advanced results for a previously submitted serp.google.ai_mode task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.google.ai_mode.task_get.advanced"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch raw HTML results for a previously submitted serp.google.ai_mode task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.google.ai_mode.task_get.html"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Submit async Google AI Mode task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.ai_mode.task_post"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that were repaired / retried for serp.google.ai_mode.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.ai_mode.tasks_fixed"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that are ready to be fetched for serp.google.ai_mode.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.ai_mode.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Google autocomplete suggestions.",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword",
      "country",
      "language"
    ],
    "stub": false,
    "type": "serp.google.autocomplete.live"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch advanced results for a previously submitted serp.google.autocomplete task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.google.autocomplete.task_get.advanced"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Submit async autocomplete task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.autocomplete.task_post"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that were repaired / retried for serp.google.autocomplete.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.autocomplete.tasks_fixed"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that are ready to be fetched for serp.google.autocomplete.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.autocomplete.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Google Dataset Info by ID.",
    "method": "POST",
    "optional": [],
    "required": [
      "dataset_id"
    ],
    "stub": false,
    "type": "serp.google.dataset_info.live"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch advanced results for a previously submitted serp.google.dataset_info task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.google.dataset_info.task_get.advanced"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Submit async Dataset Info task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.dataset_info.task_post"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that were repaired / retried for serp.google.dataset_info.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.dataset_info.tasks_fixed"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that are ready to be fetched for serp.google.dataset_info.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.dataset_info.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Google Dataset Search.",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword",
      "language"
    ],
    "stub": false,
    "type": "serp.google.dataset_search.live"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch advanced results for a previously submitted serp.google.dataset_search task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.google.dataset_search.task_get.advanced"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Submit async Dataset Search task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.dataset_search.task_post"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that were repaired / retried for serp.google.dataset_search.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.dataset_search.tasks_fixed"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that are ready to be fetched for serp.google.dataset_search.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.dataset_search.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Google Events results.",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword",
      "country",
      "language"
    ],
    "stub": false,
    "type": "serp.google.events.live"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch advanced results for a previously submitted serp.google.events task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.google.events.task_get.advanced"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Submit async Google Events task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.events.task_post"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that were repaired / retried for serp.google.events.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.events.tasks_fixed"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that are ready to be fetched for serp.google.events.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.events.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Google Finance explore (markets/categories).",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword"
    ],
    "stub": false,
    "type": "serp.google.finance_explore.live"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Google Finance explore (markets/categories). (raw HTML response).",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword"
    ],
    "stub": false,
    "type": "serp.google.finance_explore.live.html"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "DataForSEO endpoint serp/google/finance_explore/task_get/advanced (GET).",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.google.finance_explore.task_get.advanced"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "DataForSEO endpoint serp/google/finance_explore/task_get/html (GET).",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.google.finance_explore.task_get.html"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "DataForSEO endpoint serp/google/finance_explore/task_post (POST).",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.finance_explore.task_post"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "DataForSEO endpoint serp/google/finance_explore/tasks_ready (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.finance_explore.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Google Finance market overview.",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword"
    ],
    "stub": false,
    "type": "serp.google.finance_markets.live"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Google Finance market overview. (raw HTML response).",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword"
    ],
    "stub": false,
    "type": "serp.google.finance_markets.live.html"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "DataForSEO endpoint serp/google/finance_markets/task_get/advanced (GET).",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.google.finance_markets.task_get.advanced"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "DataForSEO endpoint serp/google/finance_markets/task_get/html (GET).",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.google.finance_markets.task_get.html"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "DataForSEO endpoint serp/google/finance_markets/task_post (POST).",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.finance_markets.task_post"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "DataForSEO endpoint serp/google/finance_markets/tasks_ready (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.finance_markets.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Google Finance quote for ticker.",
    "method": "POST",
    "optional": [],
    "required": [
      "ticker"
    ],
    "stub": false,
    "type": "serp.google.finance_quote.live"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Google Finance quote for ticker. (raw HTML response).",
    "method": "POST",
    "optional": [],
    "required": [
      "ticker"
    ],
    "stub": false,
    "type": "serp.google.finance_quote.live.html"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "DataForSEO endpoint serp/google/finance_quote/task_get/advanced (GET).",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.google.finance_quote.task_get.advanced"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "DataForSEO endpoint serp/google/finance_quote/task_get/html (GET).",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.google.finance_quote.task_get.html"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "DataForSEO endpoint serp/google/finance_quote/task_post (POST).",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.finance_quote.task_post"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "DataForSEO endpoint serp/google/finance_quote/tasks_ready (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.finance_quote.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Google Finance ticker symbol search.",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword"
    ],
    "stub": false,
    "type": "serp.google.finance_ticker_search.live"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "DataForSEO endpoint serp/google/finance_ticker_search/task_get/advanced (GET).",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.google.finance_ticker_search.task_get.advanced"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "DataForSEO endpoint serp/google/finance_ticker_search/task_post (POST).",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.finance_ticker_search.task_post"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "DataForSEO endpoint serp/google/finance_ticker_search/tasks_ready (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.finance_ticker_search.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Google Images results.",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword",
      "country",
      "language"
    ],
    "stub": false,
    "type": "serp.google.images.live"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Google Images results. (raw HTML response).",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword",
      "country",
      "language"
    ],
    "stub": false,
    "type": "serp.google.images.live.html"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch advanced results for a previously submitted serp.google.images task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.google.images.task_get.advanced"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch raw HTML results for a previously submitted serp.google.images task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.google.images.task_get.html"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Submit async Google Images task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.images.task_post"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that were repaired / retried for serp.google.images.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.images.tasks_fixed"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that are ready to be fetched for serp.google.images.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.images.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch advanced results for a previously submitted serp.google.jobs task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.google.jobs.task_get.advanced"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch raw HTML results for a previously submitted serp.google.jobs task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.google.jobs.task_get.html"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Google Jobs search (no live variant).",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword",
      "country",
      "language"
    ],
    "stub": false,
    "type": "serp.google.jobs.task_post"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that were repaired / retried for serp.google.jobs.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.jobs.tasks_fixed"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that are ready to be fetched for serp.google.jobs.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.jobs.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Google Local Finder (deeper local pack) results.",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword",
      "country",
      "language"
    ],
    "stub": false,
    "type": "serp.google.local_finder.live"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Google Local Finder (deeper local pack) results. (raw HTML response).",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword",
      "country",
      "language"
    ],
    "stub": false,
    "type": "serp.google.local_finder.live.html"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch advanced results for a previously submitted serp.google.local_finder task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.google.local_finder.task_get.advanced"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch raw HTML results for a previously submitted serp.google.local_finder task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.google.local_finder.task_get.html"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Submit async Local Finder task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.local_finder.task_post"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that were repaired / retried for serp.google.local_finder.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.local_finder.tasks_fixed"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that are ready to be fetched for serp.google.local_finder.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.local_finder.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Google Maps local results.",
    "method": "POST",
    "optional": [
      "depth"
    ],
    "required": [
      "keyword",
      "country",
      "language"
    ],
    "stub": false,
    "type": "serp.google.maps.live"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch advanced results for a previously submitted serp.google.maps task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.google.maps.task_get.advanced"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Submit async Google Maps task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.maps.task_post"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that were repaired / retried for serp.google.maps.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.maps.tasks_fixed"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that are ready to be fetched for serp.google.maps.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.maps.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Google News results.",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword",
      "country",
      "language"
    ],
    "stub": false,
    "type": "serp.google.news.live"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Google News results. (raw HTML response).",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword",
      "country",
      "language"
    ],
    "stub": false,
    "type": "serp.google.news.live.html"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch advanced results for a previously submitted serp.google.news task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.google.news.task_get.advanced"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch raw HTML results for a previously submitted serp.google.news task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.google.news.task_get.html"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Submit async Google News task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.news.task_post"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that were repaired / retried for serp.google.news.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.news.tasks_fixed"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that are ready to be fetched for serp.google.news.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.news.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Google organic SERP results (advanced).",
    "method": "POST",
    "optional": [
      "depth",
      "device"
    ],
    "required": [
      "keyword",
      "country",
      "language"
    ],
    "stub": false,
    "type": "serp.google.organic.live"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Google organic SERP results (advanced). (raw HTML response).",
    "method": "POST",
    "optional": [
      "depth",
      "device"
    ],
    "required": [
      "keyword",
      "country",
      "language"
    ],
    "stub": false,
    "type": "serp.google.organic.live.html"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Google organic SERP results (advanced). (regular response format - lighter payload).",
    "method": "POST",
    "optional": [
      "depth",
      "device"
    ],
    "required": [
      "keyword",
      "country",
      "language"
    ],
    "stub": false,
    "type": "serp.google.organic.live.regular"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch advanced results for a previously submitted serp.google.organic task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.google.organic.task_get.advanced"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch raw HTML results for a previously submitted serp.google.organic task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.google.organic.task_get.html"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch regular (lighter) results for a previously submitted serp.google.organic task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.google.organic.task_get.regular"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Submit async Google organic SERP task.",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword",
      "country",
      "language"
    ],
    "stub": false,
    "type": "serp.google.organic.task_post"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that were repaired / retried for serp.google.organic.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.organic.tasks_fixed"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that are ready to be fetched for serp.google.organic.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.organic.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch advanced results for a previously submitted serp.google.search_by_image task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.google.search_by_image.task_get.advanced"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Reverse image search by URL (no live variant).",
    "method": "POST",
    "optional": [],
    "required": [
      "image_url"
    ],
    "stub": false,
    "type": "serp.google.search_by_image.task_post"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that were repaired / retried for serp.google.search_by_image.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.search_by_image.tasks_fixed"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that are ready to be fetched for serp.google.search_by_image.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.google.search_by_image.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch advanced results for a previously submitted serp.naver.organic task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.naver.organic.task_get.advanced"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch raw HTML results for a previously submitted serp.naver.organic task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.naver.organic.task_get.html"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch regular (lighter) results for a previously submitted serp.naver.organic task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.naver.organic.task_get.regular"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Naver organic SERP (Korean; task only).",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword"
    ],
    "stub": false,
    "type": "serp.naver.organic.task_post"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that were repaired / retried for serp.naver.organic.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.naver.organic.tasks_fixed"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that are ready to be fetched for serp.naver.organic.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.naver.organic.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Get screenshot URL of a SERP page (by task_id).",
    "method": "POST",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.screenshot.live"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "DataForSEO endpoint serp/seznam/languages (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.seznam.languages"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "DataForSEO endpoint serp/seznam/locations (GET).",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.seznam.locations"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch advanced results for a previously submitted serp.seznam.organic task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.seznam.organic.task_get.advanced"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch raw HTML results for a previously submitted serp.seznam.organic task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.seznam.organic.task_get.html"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch regular (lighter) results for a previously submitted serp.seznam.organic task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.seznam.organic.task_get.regular"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Seznam organic SERP (Czech; task only).",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword"
    ],
    "stub": false,
    "type": "serp.seznam.organic.task_post"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that were repaired / retried for serp.seznam.organic.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.seznam.organic.tasks_fixed"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that are ready to be fetched for serp.seznam.organic.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.seznam.organic.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "DataForSEO endpoint serp/tasks_ready (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "DataForSEO endpoint serp/yahoo/languages (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.yahoo.languages"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "DataForSEO endpoint serp/yahoo/locations (GET).",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.yahoo.locations"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Yahoo organic SERP results.",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword",
      "country",
      "language"
    ],
    "stub": false,
    "type": "serp.yahoo.organic.live"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Yahoo organic SERP results. (raw HTML response).",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword",
      "country",
      "language"
    ],
    "stub": false,
    "type": "serp.yahoo.organic.live.html"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Yahoo organic SERP results. (regular response format - lighter payload).",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword",
      "country",
      "language"
    ],
    "stub": false,
    "type": "serp.yahoo.organic.live.regular"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch advanced results for a previously submitted serp.yahoo.organic task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.yahoo.organic.task_get.advanced"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch raw HTML results for a previously submitted serp.yahoo.organic task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.yahoo.organic.task_get.html"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch regular (lighter) results for a previously submitted serp.yahoo.organic task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.yahoo.organic.task_get.regular"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Submit async Yahoo organic task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.yahoo.organic.task_post"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that were repaired / retried for serp.yahoo.organic.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.yahoo.organic.tasks_fixed"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that are ready to be fetched for serp.yahoo.organic.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.yahoo.organic.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "DataForSEO endpoint serp/youtube/languages (GET).",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.youtube.languages"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "YouTube search results.",
    "method": "POST",
    "optional": [],
    "required": [
      "keyword",
      "country",
      "language"
    ],
    "stub": false,
    "type": "serp.youtube.organic.live"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch advanced results for a previously submitted serp.youtube.organic task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.youtube.organic.task_get.advanced"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Submit async YouTube organic task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.youtube.organic.task_post"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that were repaired / retried for serp.youtube.organic.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.youtube.organic.tasks_fixed"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that are ready to be fetched for serp.youtube.organic.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.youtube.organic.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "YouTube video comments by ID.",
    "method": "POST",
    "optional": [],
    "required": [
      "video_id"
    ],
    "stub": false,
    "type": "serp.youtube.video_comments.live"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch advanced results for a previously submitted serp.youtube.video_comments task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.youtube.video_comments.task_get.advanced"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Submit async YouTube comments task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.youtube.video_comments.task_post"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that were repaired / retried for serp.youtube.video_comments.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.youtube.video_comments.tasks_fixed"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that are ready to be fetched for serp.youtube.video_comments.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.youtube.video_comments.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "YouTube video metadata by ID.",
    "method": "POST",
    "optional": [],
    "required": [
      "video_id"
    ],
    "stub": false,
    "type": "serp.youtube.video_info.live"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch advanced results for a previously submitted serp.youtube.video_info task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.youtube.video_info.task_get.advanced"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Submit async YouTube video info task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.youtube.video_info.task_post"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that were repaired / retried for serp.youtube.video_info.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.youtube.video_info.tasks_fixed"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that are ready to be fetched for serp.youtube.video_info.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.youtube.video_info.tasks_ready"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "YouTube video subtitles by ID.",
    "method": "POST",
    "optional": [],
    "required": [
      "video_id"
    ],
    "stub": false,
    "type": "serp.youtube.video_subtitles.live"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Fetch advanced results for a previously submitted serp.youtube.video_subtitles task.",
    "method": "GET",
    "optional": [],
    "required": [
      "task_id"
    ],
    "stub": false,
    "type": "serp.youtube.video_subtitles.task_get.advanced"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "Submit async YouTube subtitles task.",
    "method": "POST",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.youtube.video_subtitles.task_post"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that were repaired / retried for serp.youtube.video_subtitles.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.youtube.video_subtitles.tasks_fixed"
  },
  {
    "api": "dataforseo",
    "category": "serp",
    "description": "List async tasks that are ready to be fetched for serp.youtube.video_subtitles.",
    "method": "GET",
    "optional": [],
    "required": [],
    "stub": false,
    "type": "serp.youtube.video_subtitles.tasks_ready"
  },
]satisfies EndpointMetadata[];

export const ENDPOINT_METADATA_BY_TYPE: Record<string, EndpointMetadata> = Object.fromEntries(
  ENDPOINT_METADATA.map((endpoint) => [endpoint.type, endpoint]),
);

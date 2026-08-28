/**
 * GENERATED FILE. Do not hand-edit.
 *
 * Source: the executable request builders in `endpoints.ts`.
 * Regenerate: pnpm --ignore-workspace exec tsx --tsconfig tsconfig.json scripts/generate-endpoint-targeting.ts
 */

export type GeneratedEndpointTargetingFields = {
  country: boolean;
  language: boolean;
};

export const ENDPOINT_TARGETING_FIELDS: Record<
  string,
  GeneratedEndpointTargetingFields
> = {
  "ai.ai_keyword_data.search_volume.live": {
    "country": true,
    "language": false
  },
  "ai.chat_gpt.llm_scraper.live": {
    "country": true,
    "language": true
  },
  "ai.chat_gpt.llm_scraper.live.html": {
    "country": true,
    "language": true
  },
  "ai.chat_gpt.llm_scraper.task_post": {
    "country": true,
    "language": true
  },
  "ai.gemini.llm_scraper.live": {
    "country": true,
    "language": true
  },
  "ai.gemini.llm_scraper.live.html": {
    "country": true,
    "language": true
  },
  "ai.gemini.llm_scraper.task_post": {
    "country": true,
    "language": true
  },
  "keyword.bing.audience_estimation.live": {
    "country": true,
    "language": false
  },
  "keyword.bing.audience_estimation.task_post": {
    "country": true,
    "language": false
  },
  "keyword.bing.keyword_performance.live": {
    "country": true,
    "language": true
  },
  "keyword.bing.keyword_performance.task_post": {
    "country": true,
    "language": true
  },
  "keyword.bing.keywords_for_keywords.live": {
    "country": true,
    "language": true
  },
  "keyword.bing.keywords_for_keywords.task_post": {
    "country": true,
    "language": true
  },
  "keyword.bing.keywords_for_site.task_post": {
    "country": true,
    "language": true
  },
  "keyword.bing.search_volume_history.live": {
    "country": true,
    "language": true
  },
  "keyword.bing.search_volume_history.task_post": {
    "country": true,
    "language": true
  },
  "keyword.bing.search_volume.live": {
    "country": true,
    "language": true
  },
  "keyword.bing.search_volume.task_post": {
    "country": true,
    "language": true
  },
  "keyword.clickstream.bulk_search_volume.live": {
    "country": true,
    "language": true
  },
  "keyword.clickstream.dataforseo_search_volume.live": {
    "country": true,
    "language": true
  },
  "keyword.dataforseo_trends.demography.live": {
    "country": true,
    "language": false
  },
  "keyword.dataforseo_trends.explore.live": {
    "country": true,
    "language": false
  },
  "keyword.dataforseo_trends.merged_data.live": {
    "country": true,
    "language": false
  },
  "keyword.dataforseo_trends.subregion_interests.live": {
    "country": true,
    "language": false
  },
  "keyword.google_ads.ad_traffic_by_keywords.live": {
    "country": true,
    "language": true
  },
  "keyword.google_ads.ad_traffic_by_keywords.task_post": {
    "country": true,
    "language": true
  },
  "keyword.google_ads.keywords_for_keywords.live": {
    "country": true,
    "language": true
  },
  "keyword.google_ads.keywords_for_keywords.task_post": {
    "country": true,
    "language": true
  },
  "keyword.google_ads.keywords_for_site.task_post": {
    "country": true,
    "language": true
  },
  "keyword.google_ads.search_volume.live": {
    "country": true,
    "language": true
  },
  "keyword.google_ads.search_volume.task_post": {
    "country": true,
    "language": true
  },
  "keyword.google_trends.explore.live": {
    "country": true,
    "language": true
  },
  "keyword.google_trends.explore.task_post": {
    "country": true,
    "language": true
  },
  "labs.amazon.bulk_search_volume.live": {
    "country": true,
    "language": true
  },
  "labs.amazon.product_competitors.live": {
    "country": true,
    "language": true
  },
  "labs.amazon.product_keyword_intersections.live": {
    "country": true,
    "language": true
  },
  "labs.amazon.product_rank_overview.live": {
    "country": true,
    "language": true
  },
  "labs.amazon.related_keywords.live": {
    "country": true,
    "language": true
  },
  "labs.apple.app_competitors.live": {
    "country": true,
    "language": true
  },
  "labs.apple.app_intersection.live": {
    "country": true,
    "language": true
  },
  "labs.apple.bulk_app_metrics.live": {
    "country": true,
    "language": true
  },
  "labs.apple.keywords_for_app.live": {
    "country": true,
    "language": true
  },
  "labs.google_play.app_competitors.live": {
    "country": true,
    "language": true
  },
  "labs.google_play.app_intersection.live": {
    "country": true,
    "language": true
  },
  "labs.google_play.bulk_app_metrics.live": {
    "country": true,
    "language": true
  },
  "labs.google_play.keywords_for_app.live": {
    "country": true,
    "language": true
  },
  "labs.google.bulk_keyword_difficulty.live": {
    "country": true,
    "language": true
  },
  "labs.google.categories_for_domain.live": {
    "country": true,
    "language": true
  },
  "labs.google.categories_for_keywords.live": {
    "country": false,
    "language": true
  },
  "labs.google.historical_keyword_data.live": {
    "country": true,
    "language": true
  },
  "labs.google.keyword_ideas.live": {
    "country": true,
    "language": true
  },
  "labs.google.keyword_overview.live": {
    "country": true,
    "language": true
  },
  "labs.google.keyword_suggestions.live": {
    "country": true,
    "language": true
  },
  "labs.google.keywords_for_categories.live": {
    "country": true,
    "language": true
  },
  "labs.google.keywords_for_site.live": {
    "country": true,
    "language": true
  },
  "labs.google.related_keywords.live": {
    "country": true,
    "language": true
  },
  "labs.google.search_intent.live": {
    "country": false,
    "language": true
  },
  "labs.google.serp_competitors.live": {
    "country": true,
    "language": true
  },
  "labs.google.top_searches.live": {
    "country": true,
    "language": true
  },
  "serp.baidu.organic.task_post": {
    "country": true,
    "language": false
  },
  "serp.bing.organic.live": {
    "country": true,
    "language": true
  },
  "serp.bing.organic.live.html": {
    "country": true,
    "language": true
  },
  "serp.bing.organic.live.regular": {
    "country": true,
    "language": true
  },
  "serp.bing.organic.task_post": {
    "country": true,
    "language": true
  },
  "serp.google.ads_advertisers.task_post": {
    "country": true,
    "language": true
  },
  "serp.google.ads_search.task_post": {
    "country": true,
    "language": false
  },
  "serp.google.ai_mode.live": {
    "country": true,
    "language": true
  },
  "serp.google.ai_mode.live.html": {
    "country": true,
    "language": true
  },
  "serp.google.ai_mode.task_post": {
    "country": true,
    "language": true
  },
  "serp.google.autocomplete.live": {
    "country": true,
    "language": true
  },
  "serp.google.autocomplete.task_post": {
    "country": true,
    "language": true
  },
  "serp.google.dataset_info.live": {
    "country": false,
    "language": true
  },
  "serp.google.dataset_info.task_post": {
    "country": false,
    "language": true
  },
  "serp.google.dataset_search.live": {
    "country": true,
    "language": true
  },
  "serp.google.dataset_search.task_post": {
    "country": true,
    "language": true
  },
  "serp.google.events.live": {
    "country": true,
    "language": true
  },
  "serp.google.events.task_post": {
    "country": true,
    "language": true
  },
  "serp.google.finance_explore.live": {
    "country": true,
    "language": true
  },
  "serp.google.finance_explore.live.html": {
    "country": true,
    "language": true
  },
  "serp.google.finance_explore.task_post": {
    "country": true,
    "language": true
  },
  "serp.google.finance_markets.live": {
    "country": true,
    "language": true
  },
  "serp.google.finance_markets.live.html": {
    "country": true,
    "language": true
  },
  "serp.google.finance_markets.task_post": {
    "country": true,
    "language": true
  },
  "serp.google.finance_quote.task_post": {
    "country": true,
    "language": true
  },
  "serp.google.finance_ticker_search.live": {
    "country": true,
    "language": true
  },
  "serp.google.finance_ticker_search.task_post": {
    "country": true,
    "language": true
  },
  "serp.google.images.live": {
    "country": true,
    "language": true
  },
  "serp.google.images.live.html": {
    "country": true,
    "language": true
  },
  "serp.google.images.task_post": {
    "country": true,
    "language": true
  },
  "serp.google.jobs.task_post": {
    "country": true,
    "language": true
  },
  "serp.google.local_finder.live": {
    "country": true,
    "language": true
  },
  "serp.google.local_finder.live.html": {
    "country": true,
    "language": true
  },
  "serp.google.local_finder.task_post": {
    "country": true,
    "language": true
  },
  "serp.google.maps.live": {
    "country": true,
    "language": true
  },
  "serp.google.maps.task_post": {
    "country": true,
    "language": true
  },
  "serp.google.news.live": {
    "country": true,
    "language": true
  },
  "serp.google.news.live.html": {
    "country": true,
    "language": true
  },
  "serp.google.news.task_post": {
    "country": true,
    "language": true
  },
  "serp.google.organic.live": {
    "country": true,
    "language": true
  },
  "serp.google.organic.live.html": {
    "country": true,
    "language": true
  },
  "serp.google.organic.live.regular": {
    "country": true,
    "language": true
  },
  "serp.google.organic.task_post": {
    "country": true,
    "language": true
  },
  "serp.naver.organic.task_post": {
    "country": true,
    "language": true
  },
  "serp.seznam.organic.task_post": {
    "country": true,
    "language": false
  },
  "serp.yahoo.organic.live": {
    "country": true,
    "language": true
  },
  "serp.yahoo.organic.live.html": {
    "country": true,
    "language": true
  },
  "serp.yahoo.organic.live.regular": {
    "country": true,
    "language": true
  },
  "serp.yahoo.organic.task_post": {
    "country": true,
    "language": true
  },
  "serp.youtube.organic.live": {
    "country": true,
    "language": true
  },
  "serp.youtube.organic.task_post": {
    "country": true,
    "language": true
  },
  "serp.youtube.video_comments.live": {
    "country": false,
    "language": true
  },
  "serp.youtube.video_comments.task_post": {
    "country": false,
    "language": true
  },
  "serp.youtube.video_info.live": {
    "country": false,
    "language": true
  },
  "serp.youtube.video_info.task_post": {
    "country": false,
    "language": true
  },
  "serp.youtube.video_subtitles.live": {
    "country": false,
    "language": true
  },
  "serp.youtube.video_subtitles.task_post": {
    "country": false,
    "language": true
  }
};

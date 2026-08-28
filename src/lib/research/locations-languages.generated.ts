/**
 * GENERATED FILE. Do not hand-edit.
 *
 * Sources: DataForSEO Labs, Bing Keywords Data, and Bing SERP free reference
 * endpoints. Regenerate with:
 * pnpm --ignore-workspace exec tsx --tsconfig tsconfig.json scripts/generate-locations-languages.ts
 *
 * 94 product locations and 46 distinct product languages.
 * Each provider family keeps its own targeting contract below.
 */

export type DfsSource = 'google' | 'bing' | 'amazon';

export type DfsCatalogLanguage = {
  code: string;
  name: string;
  /** Which Labs search engines carry data for this location/language pair. */
  sources: DfsSource[];
};

export type DfsCatalogLocation = {
  /** DataForSEO numeric location_code. */
  code: number;
  /** ISO 3166-1 alpha-2, the value the UI stores. */
  iso: string;
  /** DataForSEO location_name, sent alongside the code. */
  name: string;
  languages: DfsCatalogLanguage[];
};

export const DFS_TARGETING_SOURCE_URLS = {
  "labs": "https://api.dataforseo.com/v3/dataforseo_labs/locations_and_languages",
  "bingKeywordsLocations": "https://api.dataforseo.com/v3/keywords_data/bing/locations",
  "bingKeywordsLanguages": "https://api.dataforseo.com/v3/keywords_data/bing/languages",
  "bingSearchVolumeHistory": "https://api.dataforseo.com/v3/keywords_data/bing/search_volume_history/locations_and_languages",
  "bingKeywordPerformance": "https://api.dataforseo.com/v3/keywords_data/bing/keyword_performance/locations_and_languages",
  "bingSerpLocations": "https://api.dataforseo.com/v3/serp/bing/locations",
  "bingSerpLanguages": "https://api.dataforseo.com/v3/serp/bing/languages"
} as const;

export const DFS_CATALOG_SOURCE_URL = DFS_TARGETING_SOURCE_URLS.labs;

export const BING_KEYWORDS_LOCATION_CODES = [2036,2124,2250,2276,2826,2840] as const;
export const BING_KEYWORDS_LANGUAGE_CODES = ["de","en","fr"] as const;
export const BING_SEARCH_VOLUME_HISTORY_PAIRS = ["AR:es","AT:de","AU:en","CA:en","CA:fr","CH:de","CH:fr","CL:es","CO:es","DE:de","DK:da","ES:es","FI:fi","FR:fr","GB:en","HK:zh-CN","HK:zh-TW","ID:en","IE:en","IN:en","IT:it","MX:es","MY:en","NL:nl","NZ:en","PE:es","PH:en","SE:sv","SG:en","TH:en","TW:zh-CN","TW:zh-TW","US:en","VE:es","VN:en"] as const;
export const BING_KEYWORD_PERFORMANCE_PAIRS = ["AR:es","AT:de","AU:en","CA:en","CA:fr","CH:de","CH:fr","CL:es","CO:es","DE:de","DK:da","ES:es","FI:fi","FR:fr","GB:en","HK:zh-CN","HK:zh-TW","ID:en","IE:en","IN:en","IT:it","MX:es","MY:en","NL:nl","NZ:en","PE:es","PH:en","SE:sv","SG:en","TH:en","TW:zh-CN","TW:zh-TW","US:en","VE:es","VN:en"] as const;
export const BING_SERP_LOCATION_CODES = [2008,2012,2024,2031,2032,2036,2040,2048,2050,2051,2056,2068,2070,2076,2100,2104,2116,2120,2124,2144,2152,2158,2170,2188,2191,2196,2203,2208,2218,2222,2233,2246,2250,2276,2288,2300,2320,2344,2348,2356,2360,2372,2376,2380,2384,2392,2398,2400,2404,2410,2428,2440,2458,2470,2484,2492,2498,2504,2528,2554,2558,2566,2578,2586,2591,2600,2604,2608,2616,2620,2642,2682,2686,2688,2702,2703,2704,2705,2710,2724,2752,2756,2764,2784,2788,2792,2804,2807,2818,2826,2840,2854,2858,2862] as const;
export const BING_SERP_LANGUAGE_CODES = ["ar","bg","ca","cs","da","de","el","en","en-GB","es","et","eu","fi","fr","gl","gu","he","hi","hr","hu","is","it","ja","kn","ko","lt","lv","mr","ms","nb","nl","no","pa","pl","pt-BR","pt-PT","ro","ru","sk","sl","sv","ta","te","th","tr","uk","vi","zh-CN","zh-TW"] as const;

export const DFS_LOCATION_CATALOG: DfsCatalogLocation[] = [
  {
    "code": 2008,
    "iso": "AL",
    "name": "Albania",
    "languages": [
      {
        "code": "sq",
        "name": "Albanian",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2012,
    "iso": "DZ",
    "name": "Algeria",
    "languages": [
      {
        "code": "ar",
        "name": "Arabic",
        "sources": [
          "google"
        ]
      },
      {
        "code": "fr",
        "name": "French",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2024,
    "iso": "AO",
    "name": "Angola",
    "languages": [
      {
        "code": "pt",
        "name": "Portuguese",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2032,
    "iso": "AR",
    "name": "Argentina",
    "languages": [
      {
        "code": "es",
        "name": "Spanish",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2051,
    "iso": "AM",
    "name": "Armenia",
    "languages": [
      {
        "code": "hy",
        "name": "Armenian",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2036,
    "iso": "AU",
    "name": "Australia",
    "languages": [
      {
        "code": "en",
        "name": "English",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2040,
    "iso": "AT",
    "name": "Austria",
    "languages": [
      {
        "code": "de",
        "name": "German",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2031,
    "iso": "AZ",
    "name": "Azerbaijan",
    "languages": [
      {
        "code": "az",
        "name": "Azeri",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2048,
    "iso": "BH",
    "name": "Bahrain",
    "languages": [
      {
        "code": "ar",
        "name": "Arabic",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2050,
    "iso": "BD",
    "name": "Bangladesh",
    "languages": [
      {
        "code": "bn",
        "name": "Bengali",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2056,
    "iso": "BE",
    "name": "Belgium",
    "languages": [
      {
        "code": "nl",
        "name": "Dutch",
        "sources": [
          "google"
        ]
      },
      {
        "code": "fr",
        "name": "French",
        "sources": [
          "google"
        ]
      },
      {
        "code": "de",
        "name": "German",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2068,
    "iso": "BO",
    "name": "Bolivia",
    "languages": [
      {
        "code": "es",
        "name": "Spanish",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2070,
    "iso": "BA",
    "name": "Bosnia and Herzegovina",
    "languages": [
      {
        "code": "bs",
        "name": "Bosnian",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2076,
    "iso": "BR",
    "name": "Brazil",
    "languages": [
      {
        "code": "pt",
        "name": "Portuguese",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2100,
    "iso": "BG",
    "name": "Bulgaria",
    "languages": [
      {
        "code": "bg",
        "name": "Bulgarian",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2854,
    "iso": "BF",
    "name": "Burkina Faso",
    "languages": [
      {
        "code": "fr",
        "name": "French",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2116,
    "iso": "KH",
    "name": "Cambodia",
    "languages": [
      {
        "code": "en",
        "name": "English",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2120,
    "iso": "CM",
    "name": "Cameroon",
    "languages": [
      {
        "code": "fr",
        "name": "French",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2124,
    "iso": "CA",
    "name": "Canada",
    "languages": [
      {
        "code": "en",
        "name": "English",
        "sources": [
          "google"
        ]
      },
      {
        "code": "fr",
        "name": "French",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2152,
    "iso": "CL",
    "name": "Chile",
    "languages": [
      {
        "code": "es",
        "name": "Spanish",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2170,
    "iso": "CO",
    "name": "Colombia",
    "languages": [
      {
        "code": "es",
        "name": "Spanish",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2188,
    "iso": "CR",
    "name": "Costa Rica",
    "languages": [
      {
        "code": "es",
        "name": "Spanish",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2384,
    "iso": "CI",
    "name": "Cote d'Ivoire",
    "languages": [
      {
        "code": "fr",
        "name": "French",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2191,
    "iso": "HR",
    "name": "Croatia",
    "languages": [
      {
        "code": "hr",
        "name": "Croatian",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2196,
    "iso": "CY",
    "name": "Cyprus",
    "languages": [
      {
        "code": "en",
        "name": "English",
        "sources": [
          "google"
        ]
      },
      {
        "code": "el",
        "name": "Greek",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2203,
    "iso": "CZ",
    "name": "Czechia",
    "languages": [
      {
        "code": "cs",
        "name": "Czech",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2208,
    "iso": "DK",
    "name": "Denmark",
    "languages": [
      {
        "code": "da",
        "name": "Danish",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2218,
    "iso": "EC",
    "name": "Ecuador",
    "languages": [
      {
        "code": "es",
        "name": "Spanish",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2818,
    "iso": "EG",
    "name": "Egypt",
    "languages": [
      {
        "code": "ar",
        "name": "Arabic",
        "sources": [
          "amazon",
          "google"
        ]
      },
      {
        "code": "en",
        "name": "English",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2222,
    "iso": "SV",
    "name": "El Salvador",
    "languages": [
      {
        "code": "es",
        "name": "Spanish",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2233,
    "iso": "EE",
    "name": "Estonia",
    "languages": [
      {
        "code": "et",
        "name": "Estonian",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2246,
    "iso": "FI",
    "name": "Finland",
    "languages": [
      {
        "code": "fi",
        "name": "Finnish",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2250,
    "iso": "FR",
    "name": "France",
    "languages": [
      {
        "code": "fr",
        "name": "French",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2276,
    "iso": "DE",
    "name": "Germany",
    "languages": [
      {
        "code": "de",
        "name": "German",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2288,
    "iso": "GH",
    "name": "Ghana",
    "languages": [
      {
        "code": "en",
        "name": "English",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2300,
    "iso": "GR",
    "name": "Greece",
    "languages": [
      {
        "code": "en",
        "name": "English",
        "sources": [
          "google"
        ]
      },
      {
        "code": "el",
        "name": "Greek",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2320,
    "iso": "GT",
    "name": "Guatemala",
    "languages": [
      {
        "code": "es",
        "name": "Spanish",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2344,
    "iso": "HK",
    "name": "Hong Kong",
    "languages": [
      {
        "code": "zh-TW",
        "name": "Chinese (Traditional)",
        "sources": [
          "google"
        ]
      },
      {
        "code": "en",
        "name": "English",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2348,
    "iso": "HU",
    "name": "Hungary",
    "languages": [
      {
        "code": "hu",
        "name": "Hungarian",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2356,
    "iso": "IN",
    "name": "India",
    "languages": [
      {
        "code": "en",
        "name": "English",
        "sources": [
          "google"
        ]
      },
      {
        "code": "hi",
        "name": "Hindi",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2360,
    "iso": "ID",
    "name": "Indonesia",
    "languages": [
      {
        "code": "en",
        "name": "English",
        "sources": [
          "google"
        ]
      },
      {
        "code": "id",
        "name": "Indonesian",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2372,
    "iso": "IE",
    "name": "Ireland",
    "languages": [
      {
        "code": "en",
        "name": "English",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2376,
    "iso": "IL",
    "name": "Israel",
    "languages": [
      {
        "code": "ar",
        "name": "Arabic",
        "sources": [
          "google"
        ]
      },
      {
        "code": "he",
        "name": "Hebrew",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2380,
    "iso": "IT",
    "name": "Italy",
    "languages": [
      {
        "code": "it",
        "name": "Italian",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2392,
    "iso": "JP",
    "name": "Japan",
    "languages": [
      {
        "code": "ja",
        "name": "Japanese",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2400,
    "iso": "JO",
    "name": "Jordan",
    "languages": [
      {
        "code": "ar",
        "name": "Arabic",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2398,
    "iso": "KZ",
    "name": "Kazakhstan",
    "languages": [
      {
        "code": "ru",
        "name": "Russian",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2404,
    "iso": "KE",
    "name": "Kenya",
    "languages": [
      {
        "code": "en",
        "name": "English",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2428,
    "iso": "LV",
    "name": "Latvia",
    "languages": [
      {
        "code": "lv",
        "name": "Latvian",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2440,
    "iso": "LT",
    "name": "Lithuania",
    "languages": [
      {
        "code": "lt",
        "name": "Lithuanian",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2458,
    "iso": "MY",
    "name": "Malaysia",
    "languages": [
      {
        "code": "en",
        "name": "English",
        "sources": [
          "google"
        ]
      },
      {
        "code": "ms",
        "name": "Malay",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2470,
    "iso": "MT",
    "name": "Malta",
    "languages": [
      {
        "code": "en",
        "name": "English",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2484,
    "iso": "MX",
    "name": "Mexico",
    "languages": [
      {
        "code": "es",
        "name": "Spanish",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2498,
    "iso": "MD",
    "name": "Moldova",
    "languages": [
      {
        "code": "ro",
        "name": "Romanian",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2492,
    "iso": "MC",
    "name": "Monaco",
    "languages": [
      {
        "code": "fr",
        "name": "French",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2504,
    "iso": "MA",
    "name": "Morocco",
    "languages": [
      {
        "code": "ar",
        "name": "Arabic",
        "sources": [
          "google"
        ]
      },
      {
        "code": "fr",
        "name": "French",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2104,
    "iso": "MM",
    "name": "Myanmar (Burma)",
    "languages": [
      {
        "code": "en",
        "name": "English",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2528,
    "iso": "NL",
    "name": "Netherlands",
    "languages": [
      {
        "code": "nl",
        "name": "Dutch",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2554,
    "iso": "NZ",
    "name": "New Zealand",
    "languages": [
      {
        "code": "en",
        "name": "English",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2558,
    "iso": "NI",
    "name": "Nicaragua",
    "languages": [
      {
        "code": "es",
        "name": "Spanish",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2566,
    "iso": "NG",
    "name": "Nigeria",
    "languages": [
      {
        "code": "en",
        "name": "English",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2807,
    "iso": "MK",
    "name": "North Macedonia",
    "languages": [
      {
        "code": "mk",
        "name": "Macedonian",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2578,
    "iso": "NO",
    "name": "Norway",
    "languages": [
      {
        "code": "nb",
        "name": "Norwegian (Bokmål)",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2586,
    "iso": "PK",
    "name": "Pakistan",
    "languages": [
      {
        "code": "en",
        "name": "English",
        "sources": [
          "google"
        ]
      },
      {
        "code": "ur",
        "name": "Urdu",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2591,
    "iso": "PA",
    "name": "Panama",
    "languages": [
      {
        "code": "es",
        "name": "Spanish",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2600,
    "iso": "PY",
    "name": "Paraguay",
    "languages": [
      {
        "code": "es",
        "name": "Spanish",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2604,
    "iso": "PE",
    "name": "Peru",
    "languages": [
      {
        "code": "es",
        "name": "Spanish",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2608,
    "iso": "PH",
    "name": "Philippines",
    "languages": [
      {
        "code": "en",
        "name": "English",
        "sources": [
          "google"
        ]
      },
      {
        "code": "tl",
        "name": "Tagalog",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2616,
    "iso": "PL",
    "name": "Poland",
    "languages": [
      {
        "code": "pl",
        "name": "Polish",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2620,
    "iso": "PT",
    "name": "Portugal",
    "languages": [
      {
        "code": "pt",
        "name": "Portuguese",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2642,
    "iso": "RO",
    "name": "Romania",
    "languages": [
      {
        "code": "ro",
        "name": "Romanian",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2682,
    "iso": "SA",
    "name": "Saudi Arabia",
    "languages": [
      {
        "code": "ar",
        "name": "Arabic",
        "sources": [
          "amazon",
          "google"
        ]
      }
    ]
  },
  {
    "code": 2686,
    "iso": "SN",
    "name": "Senegal",
    "languages": [
      {
        "code": "fr",
        "name": "French",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2688,
    "iso": "RS",
    "name": "Serbia",
    "languages": [
      {
        "code": "sr",
        "name": "Serbian",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2702,
    "iso": "SG",
    "name": "Singapore",
    "languages": [
      {
        "code": "zh-CN",
        "name": "Chinese (Simplified)",
        "sources": [
          "google"
        ]
      },
      {
        "code": "en",
        "name": "English",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2703,
    "iso": "SK",
    "name": "Slovakia",
    "languages": [
      {
        "code": "sk",
        "name": "Slovak",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2705,
    "iso": "SI",
    "name": "Slovenia",
    "languages": [
      {
        "code": "sl",
        "name": "Slovenian",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2710,
    "iso": "ZA",
    "name": "South Africa",
    "languages": [
      {
        "code": "en",
        "name": "English",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2410,
    "iso": "KR",
    "name": "South Korea",
    "languages": [
      {
        "code": "ko",
        "name": "Korean",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2724,
    "iso": "ES",
    "name": "Spain",
    "languages": [
      {
        "code": "es",
        "name": "Spanish",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2144,
    "iso": "LK",
    "name": "Sri Lanka",
    "languages": [
      {
        "code": "en",
        "name": "English",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2752,
    "iso": "SE",
    "name": "Sweden",
    "languages": [
      {
        "code": "sv",
        "name": "Swedish",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2756,
    "iso": "CH",
    "name": "Switzerland",
    "languages": [
      {
        "code": "fr",
        "name": "French",
        "sources": [
          "google"
        ]
      },
      {
        "code": "de",
        "name": "German",
        "sources": [
          "google"
        ]
      },
      {
        "code": "it",
        "name": "Italian",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2158,
    "iso": "TW",
    "name": "Taiwan",
    "languages": [
      {
        "code": "zh-TW",
        "name": "Chinese (Traditional)",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2764,
    "iso": "TH",
    "name": "Thailand",
    "languages": [
      {
        "code": "th",
        "name": "Thai",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2788,
    "iso": "TN",
    "name": "Tunisia",
    "languages": [
      {
        "code": "ar",
        "name": "Arabic",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2792,
    "iso": "TR",
    "name": "Turkiye",
    "languages": [
      {
        "code": "tr",
        "name": "Turkish",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2804,
    "iso": "UA",
    "name": "Ukraine",
    "languages": [
      {
        "code": "ru",
        "name": "Russian",
        "sources": [
          "google"
        ]
      },
      {
        "code": "uk",
        "name": "Ukrainian",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2784,
    "iso": "AE",
    "name": "United Arab Emirates",
    "languages": [
      {
        "code": "ar",
        "name": "Arabic",
        "sources": [
          "amazon",
          "google"
        ]
      },
      {
        "code": "en",
        "name": "English",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2826,
    "iso": "GB",
    "name": "United Kingdom",
    "languages": [
      {
        "code": "en",
        "name": "English",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2840,
    "iso": "US",
    "name": "United States",
    "languages": [
      {
        "code": "en",
        "name": "English",
        "sources": [
          "amazon",
          "bing",
          "google"
        ]
      },
      {
        "code": "es",
        "name": "Spanish",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2858,
    "iso": "UY",
    "name": "Uruguay",
    "languages": [
      {
        "code": "es",
        "name": "Spanish",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2862,
    "iso": "VE",
    "name": "Venezuela",
    "languages": [
      {
        "code": "es",
        "name": "Spanish",
        "sources": [
          "google"
        ]
      }
    ]
  },
  {
    "code": 2704,
    "iso": "VN",
    "name": "Vietnam",
    "languages": [
      {
        "code": "en",
        "name": "English",
        "sources": [
          "google"
        ]
      },
      {
        "code": "vi",
        "name": "Vietnamese",
        "sources": [
          "google"
        ]
      }
    ]
  }
];

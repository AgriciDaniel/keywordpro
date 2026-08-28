'use client';

import { ParameterForm } from '@/components/research-console/ParameterForm';
import {
  CHAT_CONTEXT_FIELD_NAMES,
  buildUniqueLabels,
  getBatchSimpleField,
} from '@/components/research-console/simple-endpoint';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  getEndpointByType,
  unionEndpointFields,
  getEndpointsForSubcategory,
  getEndpointSubcategories,
  type EndpointConsoleMode,
  type EndpointInputs,
  ENDPOINT_FIELD_CONFIGS,
} from '@/lib/research/endpoint-catalog';
import { cn } from '@/lib/utils';
import { motion, useReducedMotion } from 'motion/react';
import {
  AtSign,
  BarChart3,
  ChevronDown,
  ClipboardCheck,
  Database,
  Globe2,
  Hash,
  Briefcase,
  CalendarDays,
  CandlestickChart,
  Check,
  CircleUser,
  FileText,
  FlaskConical,
  Gauge,
  Image as ImageIcon,
  LineChart,
  MapPin,
  MoreHorizontal,
  Newspaper,
  Play,
  Smartphone,
  ShoppingCart,
  TextCursorInput,
  Users,
  type LucideIcon,
  Megaphone,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

const SUBCAT_META: Record<string, { Icon: LucideIcon; color: string }> = {
  // Keyword
  'keyword-research':     { Icon: Search,         color: 'text-orange-400' },
  'serp-analysis':        { Icon: BarChart3,      color: 'text-blue-400' },
  'search-volume-cpc':    { Icon: TrendingUp,     color: 'text-green-400' },
  trends:                 { Icon: LineChart,      color: 'text-cyan-400' },
  'content-mentions':     { Icon: AtSign,         color: 'text-pink-400' },
  'ai-search-visibility': { Icon: Sparkles,       color: 'text-violet-400' },
};

const FALLBACK_META = { Icon: Database, color: 'text-[#9F9A92]' };

/**
 * Icons for the derived groupings.
 *
 * Matched on the id rather than enumerated, because the groupings come from the
 * provider's own path segments and new ones appear whenever the catalog grows.
 * First match wins, so order from most specific to least.
 */
const DERIVED_META: Array<[RegExp, { Icon: LucideIcon; color: string }]> = [
  [/search_by_image|images/, { Icon: ImageIcon, color: 'text-fuchsia-400' }],
  [/finance_ticker|finance_quote|finance_markets|finance/, { Icon: CandlestickChart, color: 'text-emerald-400' }],
  [/local_finder|maps/, { Icon: MapPin, color: 'text-rose-400' }],
  [/autocomplete/, { Icon: TextCursorInput, color: 'text-sky-300' }],
  [/dataset/, { Icon: Database, color: 'text-teal-300' }],
  [/ai_mode|-ai-/, { Icon: Sparkles, color: 'text-violet-400' }],
  [/ads_advertisers|ads_search|google_ads|ads/, { Icon: Megaphone, color: 'text-amber-400' }],
  [/audience_estimation/, { Icon: Users, color: 'text-indigo-300' }],
  [/keyword_performance|search_volume_history/, { Icon: Gauge, color: 'text-green-400' }],
  [/keywords_for_keywords|keyword/, { Icon: Hash, color: 'text-orange-400' }],
  [/news/, { Icon: Newspaper, color: 'text-blue-300' }],
  [/events/, { Icon: CalendarDays, color: 'text-cyan-300' }],
  [/jobs/, { Icon: Briefcase, color: 'text-amber-300' }],
  [/google_play/, { Icon: Play, color: 'text-lime-400' }],
  [/apple/, { Icon: Smartphone, color: 'text-slate-200' }],
  [/amazon/, { Icon: ShoppingCart, color: 'text-orange-300' }],
  [/baidu|naver|seznam/, { Icon: Globe2, color: 'text-blue-400' }],
  [/bing/, { Icon: Search, color: 'text-sky-400' }],
  [/google/, { Icon: Globe2, color: 'text-blue-400' }],
  [/domain/, { Icon: ClipboardCheck, color: 'text-emerald-400' }],
  [/content/, { Icon: FileText, color: 'text-slate-300' }],
  [/appendix|account/, { Icon: CircleUser, color: 'text-slate-300' }],
  [/labs/, { Icon: FlaskConical, color: 'text-violet-300' }],
  [/serp/, { Icon: BarChart3, color: 'text-blue-400' }],
  [/more/, { Icon: MoreHorizontal, color: 'text-[#9F9A92]' }],
];

function metaForSubcategory(id: string) {
  const exact = SUBCAT_META[id];
  if (exact) return exact;
  for (const [pattern, meta] of DERIVED_META) {
    if (pattern.test(id)) return meta;
  }
  return FALLBACK_META;
}

export function EndpointTabs({
  error,
  inputs,
  isRunning,
  mode,
  onInputsChange,
  onSubcategoryChange,
  selectedTypes,
  onEndpointToggle,
  subcategory,
  endpointType,
  advanced = false,
}: {
  advanced?: boolean;
  error: string | null;
  endpointType: string | null;
  inputs: EndpointInputs;
  isRunning: boolean;
  mode: EndpointConsoleMode;
  onInputsChange: (inputs: EndpointInputs) => void;
  onEndpointToggle: (type: string, subcategoryId?: string) => void;
  onSubcategoryChange: (subcategory: string) => void;
  selectedTypes: string[];
  subcategory: string | null;
}) {
  const selected = new Set(selectedTypes);
  const reduceMotion = useReducedMotion();
  const subcategories = getEndpointSubcategories(mode, { advanced });
  const endpoint = getEndpointByType(endpointType);

  // The batch can span endpoints with different signatures, so the form covers
  // every field any of them needs rather than only the first one's.
  const selectedEndpoints = selectedTypes
    .map((type) => getEndpointByType(type))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const formEndpoint = (() => {
    if (selectedEndpoints.length === 0) return endpoint;
    if (selectedEndpoints.length === 1) return selectedEndpoints[0];
    const { required, optional } = unionEndpointFields(selectedEndpoints);
    return {
      ...selectedEndpoints[0],
      required,
      optional,
      stub: selectedEndpoints.every((entry) => entry.stub),
    };
  })();

  // The chat textarea absorbs a field only when every selected endpoint agrees
  // on it, otherwise the form has to ask explicitly. Resolved by the same
  // function the composer uses, so the two can never both render it.
  const batchSimpleField = getBatchSimpleField(
    selectedEndpoints.length > 0
      ? selectedEndpoints
      : endpoint
        ? [endpoint]
        : [],
  );

  // Whatever the composer already owns must not be drawn again down here.
  // Country and language come from the filter bar; the batch's shared keyword
  // field comes from the chat textarea, in every shape the batch needs.
  const hiddenFields = new Set([
    ...CHAT_CONTEXT_FIELD_NAMES,
    ...(batchSimpleField?.covered ?? []),
  ]);

  const hasParameterFields = formEndpoint
    ? formEndpoint.stub ||
      [...formEndpoint.required, ...formEndpoint.optional].some(
        (field) =>
          !hiddenFields.has(field) &&
          ENDPOINT_FIELD_CONFIGS[field]?.input !== 'hidden',
      )
    : false;

  // The form renders when there is something left for it to ask that the
  // composer and the filter bar do not already own.
  const nonHiddenFields = formEndpoint
    ? [...formEndpoint.required, ...formEndpoint.optional].filter(
        (field) =>
          !hiddenFields.has(field) &&
          ENDPOINT_FIELD_CONFIGS[field]?.input !== 'hidden',
      )
    : [];
  const showForm = Boolean(
    formEndpoint &&
      hasParameterFields &&
      (formEndpoint.stub || nonHiddenFields.length > 0),
  );

  return (
    <section
      aria-label="Endpoint selector"
      className="mt-[clamp(0.75rem,2vh,1rem)] w-full text-left"
      style={{ maxWidth: 'var(--console-measure-wide)' }}
    >
      {/* The selector and parameter form keep the composer's narrow measure;
          only the result tables use the full width below. */}
      <div className="mx-auto w-full" style={{ maxWidth: 'var(--console-measure)' }}>
      {/* Sub-category pills (centered). Each pill is its own dropdown - clicking it switches
          the sub-cat (smart-defaults the endpoint) AND opens a list of endpoints in that sub-cat. */}
      <motion.div
        className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2"
        layout
        transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        {subcategories.map((sub) => {
          const active = sub.id === subcategory;
          const meta = metaForSubcategory(sub.id);
          const Icon = meta.Icon;
          const subEndpoints = getEndpointsForSubcategory(sub.id);
          const subLabels = buildUniqueLabels(subEndpoints.map((e) => e.type));
          const selectedHere = subEndpoints.filter((e) =>
            selected.has(e.type),
          ).length;
          return (
            <Popover key={sub.id}>
              {/* motion wrapper below keeps the reveal from snapping */}
              <PopoverTrigger asChild>
                <button
                  aria-pressed={active}
                  className={cn(
                    'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border bg-[#1D1D1C] px-3 font-medium text-xs',
                    'transition-[background-color,border-color,color,transform] duration-150 ease-out',
                    'active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2A65A]/55 focus-visible:ring-offset-1 focus-visible:ring-offset-[#1F1F1F]',
                    'disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100',
                    active
                      ? 'border-[#F2A65A]/70 bg-[#F2A65A]/[0.07] text-[#EDE7DC]'
                      : 'border-white/10 text-[#C9C4BC] hover:border-white/20 hover:bg-white/[0.055] hover:text-[#EDE7DC]',
                  )}
                  disabled={isRunning}
                  onClick={() => {
                    if (!active) onSubcategoryChange(sub.id);
                  }}
                  title={sub.description}
                  type="button"
                >
                  <Icon className={cn('size-3.5 shrink-0', meta.color)} />
                  <span>{sub.label}</span>
                  <span
                    className={cn(
                      'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-semibold text-[10px] tabular-nums transition-colors duration-150',
                      selectedHere > 0
                        ? 'bg-[#F2A65A] text-[#17120D]'
                        : 'text-[#7D7870]',
                    )}
                  >
                    {selectedHere > 0 ? selectedHere : sub.count}
                  </span>
                  <ChevronDown className="size-3 opacity-60" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="center"
                className="w-[min(360px,calc(100vw-2rem))] rounded-2xl border-white/12 bg-[#252524] p-1.5 text-[#EDE7DC] shadow-[0_24px_80px_rgba(0,0,0,0.48)] duration-200 ease-out"
                sideOffset={8}
              >
                <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[#7D7870]">
                  <Icon className={cn('size-3', meta.color)} />
                  {sub.label} · {subEndpoints.length} endpoints
                </div>
                <div className="max-h-[340px] overflow-y-auto">
                  {subEndpoints.map((ep) => {
                    const isSelected = selected.has(ep.type);
                    return (
                      <button
                        aria-checked={isSelected}
                        className={cn(
                          'flex w-full items-start gap-2 rounded-xl border px-2 py-2 text-left text-xs transition',
                          isSelected
                            ? 'border-[#F2A65A]/40 text-[#F5D1A8]'
                            : 'border-transparent text-[#EDE7DC] hover:border-white/12 hover:bg-white/[0.04]',
                        )}
                        key={ep.type}
                        // One update, not two: see handleEndpointToggle.
                        onClick={() => onEndpointToggle(ep.type, sub.id)}
                        role="checkbox"
                        type="button"
                      >
                        <span
                          className={cn(
                            'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition',
                            isSelected
                              ? 'border-[#F2A65A] bg-[#F2A65A] text-[#17120D]'
                              : 'border-white/25 text-transparent',
                          )}
                        >
                          <Check className="size-3" strokeWidth={3} />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 font-medium">
                            {subLabels.get(ep.type) ?? ep.type}
                            {ep.stub ? (
                              <span className="rounded-full border border-[#F2A65A]/35 px-1.5 py-0 text-[9px] uppercase tracking-wide text-[#F2C48A]">
                                Access
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-0.5 line-clamp-1 text-[11px] text-[#9F9A92]">
                            {ep.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          );
        })}
      </motion.div>

      {/* Parameters - only when the endpoint has multi-field config. Simple single-field endpoints
          (Username, Keyword, URL, comma-separated keyword lists, etc.) absorb the value from the
          chat textarea instead. */}
      {showForm ? (
        <div className="mt-4 rounded-2xl border border-white/8 bg-[#1F1F1E] p-3">
          <ParameterForm
            disabled={isRunning}
            endpoint={endpoint}
            hiddenFields={hiddenFields}
            inputs={inputs}
            onChange={onInputsChange}
          />
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-red-100 text-sm">
          {error}
        </div>
      ) : null}

      </div>

    </section>
  );
}

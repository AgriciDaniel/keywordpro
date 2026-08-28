'use client';

import { saveResearchRunAction } from '@/actions/research-session-actions';
import { EndpointTabs } from '@/components/research-console/EndpointTabs';
import { Loading } from '@/components/ui/circle-unique-load';
import { bundleTypes } from '@/lib/research/keyword-bundle';
import { runKeywordBundle } from '@/lib/research/keyword-bundle-runner';
import { trimBundleForStorage } from '@/lib/research/keyword-merge';
import { ResultPanel } from '@/components/research-console/results/ResultPanel';
import { augmentParamsForDispatcher } from '@/components/research-console/dfs-params';
import {
  formatResearchRunError,
  type ResearchRunErrorDisplay,
  type ResearchRunErrorInput,
} from '@/components/research-console/research-run-errors';
import {
  buildUniqueLabels,
  formatSimpleFieldValue,
  getBatchSimpleField,
  parseSimpleFieldValue,
  simpleFieldPlaceholder,
} from '@/components/research-console/simple-endpoint';
import { useTypewriter } from '@/components/research-console/use-typewriter';
import {
  ModeTabs,
  type ModeTabOption,
} from '@/components/research-console/ModeTabs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DEFAULT_RESEARCH_FILTERS,
  type ResearchConsoleRequest,
  type ResearchEndpointOptions,
  type ResearchEndpointSelection,
  type ResearchOutputFormat,
  type ResearchProvider,
  type ResearchFilters,
  type ResearchInputType,
  type ResearchMode,
  type ResearchCategory,
  type ResearchSource,
  type ResearchSourceScope,
  type ResearchTab,
} from '@/lib/research/console-types';
import {
  defaultInputsForEndpoint,
  getEndpointByType,
  getEndpointsForSubcategory,
  getEndpointSubcategories,
  getSmartDefaultEndpointType,
  subcategoryForEndpoint,
  getSubcategoryById,
  batchInputsFilled,
  describeBatchMissingInputs,
  type EndpointCatalogEntry,
  type EndpointConsoleMode,
  type EndpointInputs,
} from '@/lib/research/endpoint-catalog';
import {
  COUNTRY_OPTIONS,
  LANGUAGE_OPTIONS,
  defaultLanguageForCountry,
  endpointTargetingCompatibility,
  findLocationByIso,
  languageOptionGroupsForCountry,
} from '@/lib/research/locations-languages';
import {
  estimateBatchCents,
  formatCents,
} from '@/lib/research/cost-table';
import { Routes } from '@/routes';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUp,
  ChevronDown,
  Clock,
  Globe,
  Loader2,
  SlidersHorizontal,
  type LucideIcon,
  ServerOff,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type CommandMode = 'keyword';

/** One finished call in a batch. */
type EndpointRunResult = {
  type: string;
  label: string;
  response: unknown;
  error: string | null;
};

type EndpointUiState = {
  mode: EndpointConsoleMode | null;
  subcategory: string | null;
  /** The endpoint driving the parameter form and the chat-field absorption. */
  endpointType: string | null;
  /** Everything ticked for the next run. Always contains endpointType. */
  selectedTypes: string[];
  inputs: EndpointInputs;
  isRunning: boolean;
  results: EndpointRunResult[];
  error: string | null;
};

type ModuleRunUiState = {
  endpointLabel: string;
  moduleId?: string | null;
  response: unknown;
} | null;

type ResearchRunResponse =
  | {
      ok: true;
      data: unknown;
      cost: number;
      raw: unknown;
      projector_version: string;
    }
  | {
      ok: false;
      error?: ResearchRunErrorInput;
    };

const RESEARCH_RUN_TOAST_ICONS: Record<
  ResearchRunErrorDisplay['icon'],
  LucideIcon
> = {
  auth: AlertCircle,
  generic: AlertCircle,
  rate: Clock,
  transient: ServerOff,
  validation: AlertTriangle,
};

function hasSandboxFilter(
  filters: ResearchFilters | undefined,
): filters is ResearchFilters & { sandbox?: boolean } {
  return Boolean(filters && 'sandbox' in filters);
}

type CommandModeOption = {
  tab: ResearchTab;
  placeholder: string;
};

const COMMAND_MODE_OPTIONS: Record<CommandMode, CommandModeOption> = {
  keyword: {
    tab: 'keywords',
    placeholder: 'Type a topic or keyword here...',
  },
};

const MODE_TAB_OPTIONS: Array<ModeTabOption & { value: CommandMode }> = [
  { value: 'keyword', label: 'Keyword' },
];

function isLockedMode(mode: CommandMode): boolean {
  return Boolean(MODE_TAB_OPTIONS.find((option) => option.value === mode)?.locked);
}

type SourceOption = {
  id: ResearchSourceScope;
  label: string;
  provider: ResearchProvider;
  appliesTo: CommandMode[];
  description: string;
  status: 'live' | 'planned';
};

const DEFAULT_ENDPOINT_OPTIONS: ResearchEndpointOptions = {
  limit: 10,
  freshness: 'any',
  includePageContent: false,
  mainContentOnly: true,
  parsePdf: false,
  enhancedMode: false,
};

const SOURCE_OPTIONS: SourceOption[] = [
  {
    id: 'keywords',
    label: 'Keywords',
    provider: 'dataforseo',
    appliesTo: ['keyword'],
    description: 'Volume, CPC, difficulty, and related keyword demand.',
    status: 'live',
  },
  {
    id: 'serp',
    label: 'SERP',
    provider: 'dataforseo',
    appliesTo: ['keyword'],
    description: 'Organic results, competitors, and ranking opportunities.',
    status: 'live',
  },
];

function defaultSourcesForMode(_mode: CommandMode): ResearchSourceScope[] {
  return ['keywords'];
}

function isSourceLive(sourceId: ResearchSourceScope) {
  return (
    SOURCE_OPTIONS.find((source) => source.id === sourceId)?.status === 'live'
  );
}

function sourceAppliesToMode(sourceId: ResearchSourceScope, mode: CommandMode) {
  return Boolean(
    SOURCE_OPTIONS.find((source) => source.id === sourceId)?.appliesTo.includes(
      mode,
    ),
  );
}

function cleanSelectableSources(
  sources: ResearchSourceScope[] | undefined,
  mode: CommandMode,
) {
  const liveSources = (sources ?? []).filter(
    (source) => isSourceLive(source) && sourceAppliesToMode(source, mode),
  );
  return liveSources.length > 0 ? liveSources : defaultSourcesForMode(mode);
}

function categoryForMode(_mode: CommandMode): ResearchCategory {
  return 'seo';
}

function providersForSources(sources: ResearchSourceScope[]): ResearchProvider[] {
  return Array.from(
    new Set(
      SOURCE_OPTIONS.filter((source) => sources.includes(source.id)).map(
        (source) => source.provider,
      ),
    ),
  );
}

function buildEndpointSelection({
  sources,
  format,
  category,
  options,
}: {
  sources: ResearchSourceScope[];
  format: ResearchOutputFormat;
  category: ResearchCategory;
  options: ResearchEndpointOptions;
}): ResearchEndpointSelection {
  return {
    providers: providersForSources(sources),
    sources,
    format,
    category,
    options,
  };
}

function _displaySource(source: ResearchSource | null | undefined) {
  if (!source) return null;
  if (source === 'mock') return 'sample';
  return source;
}

function _sanitizeDisplayText(value: string) {
  return value.replace(/Live .* failed: .*?\. Returned/i, 'Live research failed. Returned');
}

function inferInitialCommandMode(
  _input?: string | null,
  _results?: EndpointRunResult[],
): CommandMode {
  return 'keyword';
}

function resolveRequestInputType(_commandMode: CommandMode): ResearchInputType {
  return 'keyword';
}

const ADVANCED_MODE_STORAGE_KEY = 'keyword-pro:research-advanced-mode';
const ENDPOINT_SELECTION_STORAGE_KEY = 'keyword-pro:research-endpoint-selection';
const ENDPOINT_TARGETING_STORAGE_KEY = 'keyword-pro:research-endpoint-targeting';

function readStoredEndpointSelection(mode: EndpointConsoleMode) {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(ENDPOINT_SELECTION_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<
      Record<EndpointConsoleMode, { subcategory?: string; endpointType?: string }>
    >;
    return parsed[mode] ?? null;
  } catch {
    return null;
  }
}

function persistEndpointSelection(
  mode: EndpointConsoleMode,
  selection: Pick<EndpointUiState, 'subcategory' | 'endpointType'>,
) {
  if (typeof window === 'undefined') return;
  try {
    const stored = window.localStorage.getItem(ENDPOINT_SELECTION_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    window.localStorage.setItem(
      ENDPOINT_SELECTION_STORAGE_KEY,
      JSON.stringify({
        ...parsed,
        [mode]: {
          subcategory: selection.subcategory,
          endpointType: selection.endpointType,
        },
      }),
    );
  } catch {
    // localStorage is an enhancement; ignore private-mode failures.
  }
}

function readStoredAdvancedMode() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(ADVANCED_MODE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function persistAdvancedMode(advanced: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ADVANCED_MODE_STORAGE_KEY, String(advanced));
  } catch {
    // localStorage is an enhancement; ignore private-mode failures.
  }
}

function readStoredTargeting() {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(ENDPOINT_TARGETING_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as Partial<Record<'country' | 'language', string>>;
  } catch {
    return null;
  }
}

function persistEndpointTargeting(inputs: EndpointInputs) {
  if (typeof window === 'undefined') return;
  const country = typeof inputs.country === 'string' ? inputs.country : undefined;
  const language =
    typeof inputs.language === 'string' ? inputs.language : undefined;
  if (!country && !language) return;
  try {
    const stored = readStoredTargeting() ?? {};
    window.localStorage.setItem(
      ENDPOINT_TARGETING_STORAGE_KEY,
      JSON.stringify({
        ...stored,
        ...(country ? { country } : {}),
        ...(language ? { language } : {}),
      }),
    );
  } catch {
    // localStorage is an enhancement; ignore private-mode failures.
  }
}

function endpointDefaultsFromFilters(filters: ResearchFilters) {
  const stored = readStoredTargeting();
  return {
    country: stored?.country ?? filters.location,
    language: stored?.language ?? filters.language,
  };
}

function endpointUsesContextField(
  endpoint: EndpointCatalogEntry | null,
  field: 'country' | 'language',
) {
  if (!endpoint) return false;
  return endpoint.required.includes(field) || endpoint.optional.includes(field);
}

function mergeEndpointTargeting(
  endpoint: EndpointCatalogEntry | null,
  inputs: EndpointInputs,
  filters: ResearchFilters,
): EndpointInputs {
  if (!endpoint) return inputs;
  const merged = { ...inputs };
  if (endpointUsesContextField(endpoint, 'country')) {
    merged.country = filters.location;
  }
  if (endpointUsesContextField(endpoint, 'language')) {
    merged.language = filters.language;
  }
  return merged;
}

function createEndpointUiState({
  filters,
  mode,
  restoreStored = true,
}: {
  filters: ResearchFilters;
  mode: CommandMode;
  restoreStored?: boolean;
}): EndpointUiState {
  const stored = restoreStored ? readStoredEndpointSelection(mode) : null;
  const storedSubcategory =
    stored?.subcategory && getSubcategoryById(stored.subcategory)?.mode === mode
      ? stored.subcategory
      : null;
  const fallbackEndpointType = storedSubcategory
    ? getSmartDefaultEndpointType(storedSubcategory)
    : null;
  const endpointType =
    stored?.endpointType && getEndpointByType(stored.endpointType)
      ? stored.endpointType
      : fallbackEndpointType;
  const endpoint = getEndpointByType(endpointType);

  return {
    mode,
    subcategory: storedSubcategory,
    endpointType: endpoint?.type ?? null,
    selectedTypes: endpoint ? [endpoint.type] : [],
    inputs: defaultInputsForEndpoint(endpoint, endpointDefaultsFromFilters(filters)),
    isRunning: false,
    results: [],
    error: null,
  };
}

export function ResearchConsole({
  mode,
  projectId,
  articleId,
  researchSessionId,
  initialInput,
  initialTab,
  initialFilters = DEFAULT_RESEARCH_FILTERS,
  initialEndpointSelection,
  initialResults,
  isExternallyRunning = false,
  className,
}: {
  mode: ResearchMode;
  projectId?: string | null;
  articleId?: string | null;
  researchSessionId?: string | null;
  initialInput?: string | null;
  initialTab?: ResearchTab;
  initialFilters?: ResearchFilters;
  initialEndpointSelection?: ResearchEndpointSelection | null;
  /** Cached results from a saved session, replayed without spending anything. */
  initialResults?: EndpointRunResult[];
  isExternallyRunning?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const initialCommandMode = inferInitialCommandMode(initialInput, initialResults);
  const resolvedInitialTab =
    initialTab ?? COMMAND_MODE_OPTIONS[initialCommandMode].tab;
  const [tab, setTab] = useState<ResearchTab>(resolvedInitialTab);
  const [commandMode, setCommandMode] =
    useState<CommandMode>(initialCommandMode);
  const [activeResearchSessionId, setActiveResearchSessionId] = useState<
    string | null
  >(researchSessionId ?? null);
  const [input, setInput] = useState(() => {
    const value = initialInput?.trim();
    if (value) return value;
    return mode === 'marketing' ? 'canva alternatives' : '';
  });
  const [filters, setFilters] = useState(initialFilters);
  const [endpointState, setEndpointState] = useState<EndpointUiState>(() => {
    // The first render must match the server exactly, so it cannot read
    // localStorage. The stored selection is applied in an effect below;
    // reading it here made the placeholder differ and broke hydration.
    const base = createEndpointUiState({
      filters: initialFilters,
      mode: initialCommandMode,
      restoreStored: false,
    });
    if (!initialResults || initialResults.length === 0) return base;
    // Reopening a saved search: show what was cached, and preselect the same
    // endpoints so re-running repeats the batch.
    const restoredType = initialResults[0]?.type ?? base.endpointType;
    return {
      ...base,
      subcategory:
        subcategoryForEndpoint(restoredType) ??
        base.subcategory,
      selectedTypes: initialResults.map((result) => result.type),
      endpointType: restoredType,
      results: initialResults,
    };
  });
  const hasRestoredSelection = useRef(false);
  /**
   * The input the open session actually holds, so a run can tell whether it is
   * a re-run of that search or a new one. See sessionIdForRun.
   */
  const activeInputRef = useRef(initialInput?.trim() ?? '');
  /**
   * Set when the console unmounts. The bundle is up to nineteen sequential paid
   * calls; without this, navigating away mid-run left the loop spending
   * roughly forty cents into a tree that no longer exists, and let the user
   * start a second run concurrently because the new console's isRunning was
   * false.
   */
  const abandonedRef = useRef(false);
  /** Guards re-entry independently of React state batching. */
  const runningRef = useRef(false);

  useEffect(() => {
    // Reset on mount, not only set on unmount: React Fast Refresh re-runs
    // this effect's cleanup on the same ref object, and a flag that stays
    // true afterwards stops every later run before its first call, with
    // nothing to say why. One live bundle run was lost exactly that way.
    abandonedRef.current = false;
    return () => {
      abandonedRef.current = true;
    };
  }, []);

  // Apply the remembered endpoint selection after mount, once the client is
  // free to diverge from the server-rendered markup. Skipped when a saved
  // session already supplied a selection.
  useEffect(() => {
    if (hasRestoredSelection.current) return;
    hasRestoredSelection.current = true;
    if (initialResults && initialResults.length > 0) return;

    const restored = createEndpointUiState({
      filters: initialFilters,
      mode: initialCommandMode,
    });
    if (!restored.endpointType) return;

    setEndpointState((current) =>
      current.results.length > 0 ? current : restored,
    );
  }, [initialCommandMode, initialFilters, initialResults]);
  const [_moduleRunState, setModuleRunState] =
    useState<ModuleRunUiState>(null);
  const [selectedSources, setSelectedSources] = useState<ResearchSourceScope[]>(
    () =>
      cleanSelectableSources(initialEndpointSelection?.sources, initialCommandMode),
  );
  const [endpointOptions] = useState<ResearchEndpointOptions>(
    () => ({
      ...DEFAULT_ENDPOINT_OPTIONS,
      ...initialEndpointSelection?.options,
    }),
  );
  const [isRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [endpointStatusText, setEndpointStatusText] = useState<string | null>(
    null,
  );
  // Simple shows the hand-written groupings; Advanced adds every derived one so
  // all 332 keyword endpoints stay reachable. Read after mount to avoid a hydration
  // mismatch against the server's default of false.
  const [advancedMode, setAdvancedMode] = useState(false);

  useEffect(() => {
    setAdvancedMode(readStoredAdvancedMode());
  }, []);
  const isBusy = isRunning || endpointState.isRunning || isExternallyRunning;
  const isEndpointBusy = endpointState.isRunning;
  const selectedEndpoint = getEndpointByType(endpointState.endpointType);
  const effectiveEndpointInputs = useMemo(
    () => mergeEndpointTargeting(selectedEndpoint, endpointState.inputs, filters),
    [endpointState.inputs, filters, selectedEndpoint],
  );
  // Multi-select spans subcategories, so resolve the whole batch, not just the
  // endpoint driving the parameter form.
  const selectedEndpoints = useMemo(
    () =>
      endpointState.selectedTypes
        .map((type) => getEndpointByType(type))
        .filter((entry): entry is EndpointCatalogEntry => entry !== null),
    [endpointState.selectedTypes],
  );
  const endpointLabels = useMemo(
    () => buildUniqueLabels(endpointState.selectedTypes),
    [endpointState.selectedTypes],
  );
  // Simple mode runs the whole bundle regardless of what is selected, so the
  // button has to price the bundle rather than the selection. Without this a
  // keyword and the Enter key spent around fifty cents with nothing on screen
  // to say so.
  const bundleMode = !advancedMode && commandMode === 'keyword';
  const bundleEndpointTypes = useMemo(
    () => bundleTypes(filters.location, filters.language),
    [filters.language, filters.location],
  );
  const selectedLocation = useMemo(
    () => findLocationByIso(filters.location),
    [filters.location],
  );
  const languageGroups = useMemo(
    () => languageOptionGroupsForCountry(filters.location),
    [filters.location],
  );
  const batchCents = useMemo(
    () =>
      estimateBatchCents(
        bundleMode ? bundleEndpointTypes : endpointState.selectedTypes,
        (type) => getEndpointByType(type),
      ),
    [bundleEndpointTypes, bundleMode, endpointState.selectedTypes],
  );
  const runCallCount = bundleMode
    ? bundleEndpointTypes.length
    : endpointState.selectedTypes.length;
  const advancedTargetingIssue = useMemo(() => {
    if (bundleMode) return null;
    for (const endpoint of selectedEndpoints) {
      const compatibility = endpointTargetingCompatibility(
        endpoint,
        filters.location,
        filters.language,
      );
      if (!compatibility.supported) return compatibility.reason;
    }
    return null;
  }, [bundleMode, filters.language, filters.location, selectedEndpoints]);
  // In bundle mode the selection is irrelevant: the only thing the run needs
  // is a keyword. Gating on the selected endpoint's inputs would let an
  // unrelated stored selection disable a search the user can plainly perform.
  const endpointReady = bundleMode
    ? bundleEndpointTypes.length > 0 &&
      Boolean(
        String(
          effectiveEndpointInputs.keyword ??
            effectiveEndpointInputs.keywords ??
            '',
        ).trim(),
      )
    : !advancedTargetingIssue &&
      batchInputsFilled(selectedEndpoints, effectiveEndpointInputs);
  // Say why Run is unavailable rather than just greying it out.
  const missingInputsHint = endpointReady
    ? null
    : bundleMode
      ? bundleEndpointTypes.length === 0
        ? 'Choose a valid country and language pair.'
        : 'Type a keyword first.'
      : (advancedTargetingIssue ??
        describeBatchMissingInputs(selectedEndpoints, effectiveEndpointInputs));
  /**
   * What the button says about money.
   *
   * The endpoint count belongs to advanced mode, where the user picked the
   * endpoints themselves. In one-box mode they chose nothing, so "19" is
   * noise; only the price is meaningful, and only once there is a keyword to
   * spend it on. An empty box quotes nothing.
   */
  const runCostLabel = bundleMode
    ? endpointReady
      ? formatCents(batchCents)
      : null
    : runCallCount > 1
      ? `${runCallCount} · ${formatCents(batchCents)}`
      : null;

  const commandModeOption = COMMAND_MODE_OPTIONS[commandMode];
  // When a "simple" endpoint is active (single chat-typeable required field), the chat textarea
  // becomes that field's input - the Parameters box collapses to save vertical space.
  // Resolved across the whole selection, not just the endpoint driving the
  // form, and shared with EndpointTabs so the composer and the parameter form
  // can never both render the same input.
  const batchSimpleField = getBatchSimpleField(selectedEndpoints);
  const simpleEndpointField = batchSimpleField?.field ?? null;
  const simpleEndpointValue = batchSimpleField
    ? formatSimpleFieldValue(
        // Whichever shape the batch actually holds a value in.
        batchSimpleField.covered
          .map((field) => effectiveEndpointInputs[field])
          .find((value) => value !== undefined && value !== ''),
      )
    : null;
  // What the user typed, kept verbatim. The stored value is the parsed
  // shape (a bare "example." became "https://example./" mid-word),
  // and echoing that back into a controlled textarea moved the caret past
  // the slash. The raw text is shown while it still parses to the stored
  // value; once the inputs change some other way (a session loads, a chip
  // is removed) the stored value wins again.
  const [simpleRawText, setSimpleRawText] = useState<string | null>(null);
  const simpleRawMatchesStored = (() => {
    if (!batchSimpleField || simpleRawText === null) return false;
    const storedField =
      batchSimpleField.covered.find((field) => {
        const value = effectiveEndpointInputs[field];
        return value !== undefined && value !== '';
      }) ?? batchSimpleField.field;
    return (
      formatSimpleFieldValue(parseSimpleFieldValue(storedField, simpleRawText)) ===
      formatSimpleFieldValue(effectiveEndpointInputs[storedField])
    );
  })();
  const chatTextareaValue = simpleEndpointField
    ? simpleRawMatchesStored
      ? (simpleRawText ?? '')
      : (simpleEndpointValue ?? '')
    : input;
  const chatTextareaPlaceholder = simpleEndpointField
    ? simpleFieldPlaceholder(simpleEndpointField) ?? commandModeOption.placeholder
    : commandModeOption.placeholder;
  const animatedPlaceholder = useTypewriter(chatTextareaPlaceholder);
  // Active-endpoint label shown as a passive tag in the chat footer.
  // Pills above stay invariant in width so clicking doesn't reflow the row.
  const activeSubcategoryForChip = endpointState.subcategory
    ? getSubcategoryById(endpointState.subcategory)
    : null;
  const activeEndpointChipLabel = (() => {
    if (!activeSubcategoryForChip || !endpointState.endpointType) return null;
    const labels = buildUniqueLabels(
      getEndpointsForSubcategory(activeSubcategoryForChip.id).map((e) => e.type),
    );
    return labels.get(endpointState.endpointType) ?? null;
  })();
  const endpointSelection = useMemo(
    () =>
      buildEndpointSelection({
        sources: selectedSources,
        format: initialEndpointSelection?.format ?? 'dashboard',
        category: initialEndpointSelection?.category ?? categoryForMode(commandMode),
        options: endpointOptions,
      }),
    [
      commandMode,
      endpointOptions,
      initialEndpointSelection?.category,
      initialEndpointSelection?.format,
      selectedSources,
    ],
  );
  const _displayedEndpointStatusText =
    endpointStatusText ?? (isExternallyRunning ? 'pipeline running' : null);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }
      const index = Number(event.key) - 1;
      const option = MODE_TAB_OPTIONS[index];
      if (!option) return;
      event.preventDefault();
      handleCommandModeSelect(option.value);
    }

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [filters]);

  // A stored or defaulted subcategory can point at a pill the current mode no
  // longer renders, which strands the selection and leaves the row looking
  // like nothing is active. Snap to the first visible grouping instead.
  //
  // This must not touch `results`. Advanced mode is read from localStorage
  // after mount, so this effect re-runs on every load; routing it through
  // handleSubcategorySelect wiped the cached results of a reopened saved
  // session a beat after they appeared.
  useEffect(() => {
    const visible = getEndpointSubcategories(commandMode, {
      advanced: advancedMode,
    });
    if (visible.length === 0) return;
    if (visible.some((entry) => entry.id === endpointState.subcategory)) return;

    const subcategoryId = visible[0].id;
    setEndpointState((current) => {
      // A restored session already has its endpoints; only the pill is stale.
      if (current.results.length > 0) {
        return { ...current, subcategory: subcategoryId };
      }
      const endpoint = getEndpointByType(
        getSmartDefaultEndpointType(subcategoryId),
      );
      const next: EndpointUiState = {
        ...current,
        subcategory: subcategoryId,
        endpointType: endpoint?.type ?? null,
        selectedTypes: endpoint ? [endpoint.type] : [],
        inputs: defaultInputsForEndpoint(
          endpoint,
          endpointDefaultsFromFilters(filters),
        ),
        error: null,
      };
      persistEndpointSelection(commandMode, next);
      return next;
    });
  }, [advancedMode, commandMode, endpointState.subcategory, filters]);

  const _previewRequest = useMemo<ResearchConsoleRequest>(
    () => ({
      mode,
      tab,
      input: input.trim(),
      inputType: resolveRequestInputType(commandMode),
      filters,
      endpointSelection,
      projectId: projectId ?? undefined,
      researchSessionId: activeResearchSessionId ?? undefined,
      articleId: articleId ?? undefined,
    }),
    [
      activeResearchSessionId,
      articleId,
      commandMode,
      endpointSelection,
      filters,
      input,
      mode,
      projectId,
      tab,
    ],
  );

  function handleAdvancedToggle() {
    const next = !advancedMode;
    setAdvancedMode(next);
    persistAdvancedMode(next);
  }

  function handleCommandModeSelect(nextMode: CommandMode) {
    // A run in flight owns this state. Replacing it mid-run set isRunning
    // false while the loop kept spending, which both re-enabled Run (letting a
    // second batch run concurrently) and left runningRef stuck true (making
    // the next simple-mode search a silent no-op).
    if (isBusy) return;
    // The tab, its keyboard shortcut and any stored preference all land here.
    if (isLockedMode(nextMode)) return;
    const nextOption = COMMAND_MODE_OPTIONS[nextMode];
    setCommandMode(nextMode);
    setTab(nextOption.tab);
    setSelectedSources(defaultSourcesForMode(nextMode));
    setEndpointState(
      createEndpointUiState({
        filters,
        mode: nextMode,
      }),
    );
    setModuleRunState(null);
    setEndpointStatusText(null);
    setError(null);
  }

  function handleSubcategorySelect(subcategoryId: string) {
    // Same reason as handleCommandModeSelect: this clears isRunning and
    // results out from under a run that is still spending.
    if (isBusy) return;
    const endpointType = getSmartDefaultEndpointType(subcategoryId);
    const endpoint = getEndpointByType(endpointType);
    const nextState: EndpointUiState = {
      mode: commandMode,
      subcategory: subcategoryId,
      endpointType: endpoint?.type ?? null,
      selectedTypes: endpoint ? [endpoint.type] : [],
      inputs: defaultInputsForEndpoint(
        endpoint,
        endpointDefaultsFromFilters(filters),
      ),
      isRunning: false,
      results: [],
      error: null,
    };
    setEndpointState(nextState);
    persistEndpointSelection(commandMode, nextState);
  }

  /**
   * Tick or untick one endpoint without disturbing the rest of the batch.
   *
   * `subcategoryId` folds the grouping change into this same update. Firing
   * `handleSubcategorySelect` first and then this meant a plain replacement
   * (selection reset to the grouping's default) followed by a functional
   * updater that appended to it: ticking one endpoint in another grouping's
   * dropdown selected two, billed for the one never ticked, and wiped the
   * results already on screen.
   */
  function handleEndpointToggle(endpointType: string, subcategoryId?: string) {
    if (isBusy) return;
    setEndpointState((current) => {
      const switching = Boolean(
        subcategoryId && subcategoryId !== current.subcategory,
      );
      const base: EndpointUiState = switching
        ? { ...current, subcategory: subcategoryId as string, selectedTypes: [] }
        : current;
      const isSelected = base.selectedTypes.includes(endpointType);
      const nextTypes = isSelected
        ? base.selectedTypes.filter((type) => type !== endpointType)
        : [...base.selectedTypes, endpointType];

      // Never end up with nothing selected; keep the last one.
      if (nextTypes.length === 0) return current;

      const endpoint = getEndpointByType(
        nextTypes.includes(base.endpointType ?? '')
          ? (base.endpointType as string)
          : nextTypes[0],
      );

      return {
        ...base,
        endpointType: endpoint?.type ?? null,
        selectedTypes: nextTypes,
        // Adding an endpoint can widen the required set, so seed any field the
        // form has not collected yet.
        inputs: {
          ...defaultInputsForEndpoint(
            endpoint,
            endpointDefaultsFromFilters(filters),
          ),
          ...current.inputs,
        },
        error: null,
      };
    });
  }

  function _handleEndpointTypeSelect(endpointType: string) {
    const endpoint = getEndpointByType(endpointType);
    setEndpointState((current) => {
      const nextState = {
        ...current,
        mode: commandMode,
        endpointType: endpoint?.type ?? null,
        inputs: defaultInputsForEndpoint(
          endpoint,
          endpointDefaultsFromFilters(filters),
        ),
        response: null,
        error: null,
      };
      persistEndpointSelection(commandMode, nextState);
      return nextState;
    });
  }

  function handleEndpointInputsChange(inputs: EndpointInputs) {
    persistEndpointTargeting(inputs);
    setEndpointState((current) => ({
      ...current,
      inputs,
      error: null,
    }));
  }

  function handleTargetingChange(nextFilters: ResearchFilters) {
    setFilters(nextFilters);
    persistEndpointTargeting({
      country: nextFilters.location,
      language: nextFilters.language,
    });
    setEndpointState((current) => {
      const endpoint = getEndpointByType(current.endpointType);
      if (!endpoint) return current;
      return {
        ...current,
        inputs: mergeEndpointTargeting(endpoint, current.inputs, nextFilters),
        error: null,
      };
    });
  }

  function showResearchRunError(display: ResearchRunErrorDisplay) {
    const Icon = RESEARCH_RUN_TOAST_ICONS[display.icon];
    toast.error(display.message, {
      action: display.href
        ? {
            label: 'API Credentials',
            onClick: () => router.push(display.href as string),
          }
        : undefined,
      icon: <Icon className="h-4 w-4" />,
    });
  }

  /**
   * The session a run should write into.
   *
   * Reusing the open session is right when the user re-runs the same search,
   * and destructive when they type a different one: the row keeps its name
   * while its results are replaced, and the paid research it held is gone.
   * So the id is only reused when the input matches.
   */
  function sessionIdForRun(runInput: string): string | null {
    if (!activeResearchSessionId) return null;
    return runInput.trim().toLowerCase() === activeInputRef.current.trim().toLowerCase()
      ? activeResearchSessionId
      : null;
  }

  /**
   * Persist a finished run and bind the URL to it.
   *
   * next-safe-action does not throw on a server-side failure: it resolves with
   * a `serverError` envelope. A bare try/catch therefore never fires, and a
   * failed save looked exactly like a successful one while ~$0.50 of results
   * quietly failed to persist.
   */
  async function persistRun(
    runInput: string,
    results: EndpointRunResult[],
  ): Promise<void> {
    try {
      const saved = await saveResearchRunAction({
        sessionId: sessionIdForRun(runInput),
        input: runInput,
        inputType: resolveRequestInputType(commandMode),
        tab,
        filters,
        endpointSelection,
        results,
      });

      const savedId = saved?.data?.id;
      if (!savedId) {
        toast.error(
          'Results are on screen but could not be saved. Copy or export them before leaving.',
        );
        return;
      }
      activeInputRef.current = runInput;
      if (savedId !== activeResearchSessionId) {
        setActiveResearchSessionId(savedId);
        router.replace(`${Routes.KeywordPro}/research/${savedId}`);
      }
      window.dispatchEvent(new Event('keyword-pro:refresh-research'));
    } catch {
      toast.error(
        'Results are on screen but could not be saved. Copy or export them before leaving.',
      );
    }
  }

  async function runSelectedEndpoint() {
    if (runningRef.current) return;
    const endpoints = selectedEndpoints;
    if (endpoints.length === 0) {
      setEndpointState((current) => ({
        ...current,
        error: 'Pick an endpoint first.',
      }));
      return;
    }

    const blocked = describeBatchMissingInputs(endpoints, effectiveEndpointInputs);
    if (blocked) {
      setEndpointState((current) => ({ ...current, error: blocked }));
      return;
    }

    runningRef.current = true;
    setEndpointState((current) => ({
      ...current,
      isRunning: true,
      results: [],
      error: null,
    }));

    const results: EndpointRunResult[] = [];
    let firstFailure: ResearchRunErrorDisplay | null = null;

    try {
      // Sequential on purpose: the providers rate-limit per account, and a
      // batch of 39 fired at once is the fastest way to get throttled.
      for (const [index, endpoint] of endpoints.entries()) {
        setEndpointStatusText(
          endpoints.length > 1
            ? `Running ${index + 1} of ${endpoints.length}: ${endpoint.type}`
            : `Running ${endpoint.type}...`,
        );

        const label = endpointLabels.get(endpoint.type) ?? endpoint.type;
        const endpointInputs = mergeEndpointTargeting(
          endpoint,
          endpointState.inputs,
          filters,
        );

        try {
          const idempotencyKey =
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          const response = await fetch('/api/v1/research/run', {
            body: JSON.stringify({
              endpointId: endpoint.type,
              params: augmentParamsForDispatcher(endpointInputs),
              sandbox: hasSandboxFilter(filters)
                ? Boolean(filters.sandbox)
                : false,
            }),
            headers: {
              'Content-Type': 'application/json',
              'Idempotency-Key': idempotencyKey,
            },
            method: 'POST',
          });
          const data = (await response.json().catch(() => null)) as
            | ResearchRunResponse
            | null;

          if (!response.ok || !data || data.ok !== true) {
            const display = formatResearchRunError(
              data && data.ok === false
                ? data.error
                : { message: 'Endpoint request failed.' },
            );
            firstFailure ??= display;
            results.push({
              type: endpoint.type,
              label,
              response: null,
              error: display.message,
            });
          } else {
            results.push({
              type: endpoint.type,
              label,
              response: data,
              error: null,
            });
          }
        } catch (caught) {
          const display = formatResearchRunError(
            caught instanceof Error ? { message: caught.message } : null,
          );
          firstFailure ??= display;
          results.push({
            type: endpoint.type,
            label,
            response: null,
            error: display.message,
          });
        }

        // Render each result as it lands rather than waiting for the batch.
        setEndpointState((current) => ({ ...current, results: [...results] }));
      }

      // One toast for the batch, not one per failure.
      if (firstFailure) showResearchRunError(firstFailure);

      const failed = results.filter((result) => result.error).length;
      setEndpointState((current) => ({
        ...current,
        isRunning: false,
        results,
        error:
          failed === 0
            ? null
            : failed === results.length
              ? (firstFailure?.message ?? 'Every endpoint failed.')
              : `${failed} of ${results.length} endpoints failed.`,
      }));

      // Cache the run so it lands in the sidebar and can be reopened for free.
      // A failure to save must not lose the results already on screen.
      // The composer may hold the identifying value instead of free text, so
      // prefer that value when naming the saved keyword session.
      if (results.some((result) => !result.error)) {
        await persistRun(
          (simpleEndpointValue ?? input).trim() || input.trim() || endpoints[0].type,
          results,
        );
      }
    } finally {
      runningRef.current = false;
      setEndpointStatusText(null);
    }
  }

  /**
   * One call, shared by every endpoint the bundle runs.
   *
   * Goes through the same API route as a hand-picked run, so credentials,
   * idempotency and error shaping are identical.
   */
  async function callResearchEndpoint(
    type: string,
    params: Record<string, unknown>,
  ): Promise<{ response: unknown; error: string | null }> {
    const idempotencyKey =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const httpResponse = await fetch('/api/v1/research/run', {
      body: JSON.stringify({
        endpointId: type,
        params: augmentParamsForDispatcher(params as EndpointInputs),
        sandbox: hasSandboxFilter(filters) ? Boolean(filters.sandbox) : false,
      }),
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      method: 'POST',
    });

    const data = (await httpResponse.json().catch(() => null)) as
      | ResearchRunResponse
      | null;

    if (!httpResponse.ok || !data || data.ok !== true) {
      return {
        response: null,
        error: formatResearchRunError(
          data && data.ok === false
            ? data.error
            : { message: 'Endpoint request failed.' },
        ).message,
      };
    }
    return { response: data, error: null };
  }

  /**
   * Simple mode: one keyword in, one merged dashboard out.
   *
   * Renders after every finished call rather than at the end, so the keyword
   * table is on screen within a couple of seconds while the remaining calls
   * fill in columns and panels behind it.
   */
  async function runKeywordSearch(seed: string) {
    if (runningRef.current) return;
    runningRef.current = true;
    setEndpointState((current) => ({
      ...current,
      isRunning: true,
      results: [],
      error: null,
    }));

    try {
      const merged = await runKeywordBundle({
        seed,
        params: {
          ...endpointDefaultsFromFilters(filters),
          keyword: seed,
          keywords: [seed],
        },
        call: callResearchEndpoint,
        // Checked between calls, so an abandoned run stops at the next
        // boundary instead of spending out the remaining calls.
        shouldStop: () => abandonedRef.current,
        onProgress: ({ current, done, merged: partial, total }) => {
          if (abandonedRef.current) return;
          setEndpointStatusText(
            current ? `${done}/${total} · ${current.label}` : `${done}/${total}`,
          );
          // Only start drawing once there is a table to draw.
          if (partial.count === 0) return;
          setEndpointState((state) => ({
            ...state,
            results: [
              {
                type: 'keyword.bundle',
                label: `Keyword research: ${seed}`,
                response: { ok: true, data: partial, cost: partial.meta.totalCost },
                error: null,
              },
            ],
          }));
        },
      });

      // Every attempted call is billed whether it succeeds or not. Reporting
      // a clean run when most sources failed means the user may pay again for
      // the same silence.
      const failedSources = merged.meta.sources.filter((source) => !source.ok);
      setEndpointState((state) => ({
        ...state,
        isRunning: false,
        results: [
          {
            type: 'keyword.bundle',
            label: `Keyword research: ${seed}`,
            response: { ok: true, data: merged, cost: merged.meta.totalCost },
            error: null,
          },
        ],
        error:
          merged.count === 0
            ? 'No keyword data came back. Check your DataForSEO credentials in Settings.'
            : failedSources.length > 0
              ? `${failedSources.length} of ${merged.meta.sources.length} endpoints failed: ${failedSources
                  .slice(0, 3)
                  .map((source) => source.label)
                  .join(', ')}${failedSources.length > 3 ? '…' : ''}. The rest of the data is below.`
              : null,
      }));
      setEndpointStatusText(null);

      if (merged.count > 0) {
        await persistRun(seed, [
            {
              type: 'keyword.bundle',
              label: `Keyword research: ${seed}`,
              // Trimmed, and no `raw`: the untouched envelopes of a full
              // report are 1.7MB on their own and nothing on a reopened
              // session reads them. See trimBundleForStorage.
              response: {
                ok: true,
                data: trimBundleForStorage(merged),
                cost: merged.meta.totalCost,
              },
              error: null,
            },
        ]);
      }
    } catch (caught) {
      const display = formatResearchRunError(
        caught instanceof Error ? { message: caught.message } : null,
      );
      setEndpointState((state) => ({
        ...state,
        isRunning: false,
        error: display.message,
      }));
      setEndpointStatusText(null);
    } finally {
      runningRef.current = false;
    }
  }

  async function runResearch() {
    if (isBusy) return;

    // Advanced off means the user picked nothing, so the bundle decides.
    if (!advancedMode && commandMode === 'keyword') {
      const seed = String(
        effectiveEndpointInputs.keyword ?? effectiveEndpointInputs.keywords ?? input,
      )
        .replace(/^,|,$/g, '')
        .trim();
      if (!seed) {
        setEndpointState((current) => ({
          ...current,
          error: 'Type a keyword first.',
        }));
        return;
      }
      await runKeywordSearch(seed);
      return;
    }

    await runSelectedEndpoint();
  }

    const heading = 'What are we researching?';
    // Nothing on screen below the composer: centre the welcome state instead of
    // pinning it near the top. Any result, error or in-flight run switches back
    // to top-aligned flow so a long report reads from its first row.
    const isConsoleEmpty =
      !isBusy &&
      !error &&
      !endpointState.error &&
      endpointState.results.length === 0;
    return (
      <div
        className={cn(
          'relative flex h-full min-h-[calc(100dvh-var(--header-height))] w-full flex-1 flex-col overflow-hidden bg-[#1F1F1F]',
          className,
        )}
      >
        <div className="relative flex min-h-0 flex-1 overflow-y-auto px-4 sm:px-6 md:px-8">
          {/* Two measures, both centred on the same axis: the heading, composer
              and endpoint pills share the narrow one so they stay optically
              aligned at every width and zoom level, while result tables get the
              wide one because a keyword table is 17 columns. */}
          <div
            className={cn(
              'mx-auto flex min-h-full w-full flex-col items-center',
              isConsoleEmpty
                ? 'py-[clamp(1.5rem,5vh,2.5rem)]'
                : 'pt-[clamp(2rem,9vh,6rem)] pb-[clamp(1.5rem,5vh,2.5rem)]',
            )}
            style={{ maxWidth: 'var(--console-measure-wide)' }}
          >
              {/* `my-auto` rather than `justify-center`: auto margins centre the
                  block but still let it scroll from the top on a short viewport,
                  where centring would clip the heading out of reach. */}
              <div
                className={cn(
                  'flex w-full flex-col items-center',
                  isConsoleEmpty && 'my-auto',
                )}
              >
                <div className="flex w-full flex-col items-center text-center">
                  <div
                    className="flex w-full flex-col items-center"
                    style={{ maxWidth: 'var(--console-measure)' }}
                  >
                  <h1 className="text-balance px-2 font-normal text-[#EDE7DC] text-[clamp(1.35rem,4.4vw,2.55rem)] leading-[1.12] tracking-normal">
                    {heading}
                  </h1>

                  <div className="mt-[clamp(1.25rem,3vh,1.75rem)] w-full rounded-[clamp(20px,2.5vw,30px)] border border-white/10 bg-[#262625] p-3 text-left shadow-[0_18px_54px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.045)] sm:p-4">
                    <textarea
                      className="h-[clamp(56px,9vh,78px)] max-h-[190px] w-full resize-none bg-transparent px-2 pt-1 text-[#F4F4F5] text-base leading-7 outline-none placeholder:text-white/35 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-lg"
                      onChange={(event) => {
                        const value = event.target.value;
                        if (batchSimpleField) {
                          setSimpleRawText(value);
                          // One keystroke, every shape the batch needs: a
                          // string for `keyword`, an array for `keywords`.
                          const next = { ...effectiveEndpointInputs };
                          for (const field of batchSimpleField.covered) {
                            next[field] = parseSimpleFieldValue(field, value);
                          }
                          // A bare domain gets https assumed; remembered so a
                          // page-level call can fall back to http.
                          if (batchSimpleField.covered.includes('url')) {
                            next.url_scheme_assumed = !/^https?:\/\//i.test(value.trim());
                          }
                          handleEndpointInputsChange(next);
                        } else {
                          setInput(value);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          runResearch();
                        }
                      }}
                      placeholder={animatedPlaceholder}
                      value={chatTextareaValue}
                    />

                    <div className="mt-3 flex flex-col gap-3 border-white/8 border-t px-1 pt-3">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                        <div className="flex min-w-0 flex-1 basis-full items-center gap-2 sm:basis-auto sm:gap-3">
                          <ModeTabs
                            mode={commandMode}
                            onChange={(nextMode) => {
                              if (nextMode === 'keyword') {
                                handleCommandModeSelect(nextMode);
                              }
                            }}
                            options={MODE_TAB_OPTIONS}
                          />
                          {activeSubcategoryForChip && activeEndpointChipLabel ? (
                            <span className="hidden min-w-0 items-center gap-1.5 text-[#EDE7DC] text-xs font-medium sm:inline-flex">
                              <span className="truncate text-[#9F9A92]">
                                {activeSubcategoryForChip.label} ·
                              </span>
                              <span className="truncate">
                                {activeEndpointChipLabel}
                              </span>
                            </span>
                          ) : null}
                        </div>

                        <div className="ml-auto flex shrink-0 items-center justify-end gap-2">
                          <button
                            aria-label="Advanced endpoints"
                            aria-pressed={advancedMode}
                            className={cn(
                              'group/adv relative inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border sm:size-11',
                              'transition-[background-color,border-color,color] duration-200 ease-out',
                              'active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2A65A]/55',
                              'motion-reduce:transition-none motion-reduce:active:scale-100',
                              advancedMode
                                ? 'border-[#F2A65A]/70 bg-[#F2A65A]/[0.12] text-[#F2A65A]'
                                : 'border-white/10 bg-[#1D1D1C] text-white/58 hover:border-white/20 hover:bg-white/[0.055] hover:text-white/86',
                            )}
                            onClick={handleAdvancedToggle}
                            title={
                              advancedMode
                                ? 'Advanced on: pick endpoints yourself. Click for the one-box search.'
                                : 'One-box search: type a keyword and get everything. Click to pick endpoints yourself.'
                            }
                            type="button"
                          >
                            {/* A short fill sweep on activation, so the state
                                change reads as a switch rather than a repaint. */}
                            <motion.span
                              animate={{
                                scale: advancedMode ? 1 : 0,
                                opacity: advancedMode ? 1 : 0,
                              }}
                              className="pointer-events-none absolute inset-0 rounded-xl bg-[#F2A65A]/10"
                              initial={false}
                              transition={{
                                duration: reduceMotion ? 0 : 0.28,
                                ease: [0.22, 1, 0.36, 1],
                              }}
                            />
                            <motion.span
                              animate={{ rotate: advancedMode ? 90 : 0 }}
                              className="relative"
                              initial={false}
                              transition={{
                                duration: reduceMotion ? 0 : 0.28,
                                ease: [0.22, 1, 0.36, 1],
                              }}
                            >
                              <SlidersHorizontal className="size-4" />
                            </motion.span>
                          </button>

                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                aria-label="Keyword targeting"
                                className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#1D1D1C] text-white/58 transition hover:border-white/16 hover:bg-white/[0.055] hover:text-white/86 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2A65A]/55 sm:size-11"
                                title="Research targeting"
                                type="button"
                              >
                                <Globe className="size-4" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="end"
                              className="w-[min(340px,calc(100vw-2rem))] rounded-2xl border-white/12 bg-[#252524] p-3 text-[#EDE7DC] shadow-[0_24px_80px_rgba(0,0,0,0.48)] duration-200 ease-out"
                              side="top"
                              sideOffset={10}
                            >
                              <div className="grid gap-2">
                                <label className="grid gap-1 text-[#9F9A92] text-xs">
                                  Country
                                  <span className="relative block">
                                    <select
                                      aria-label="Keyword country"
                                      className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-[#1D1D1C] py-0 pr-10 pl-3 text-[#EDE7DC] text-sm outline-none transition hover:border-white/16 focus:border-[#F2A65A]/65"
                                      onChange={(event) => {
                                        const location = event.target.value;
                                        // Language coverage is per country, so a
                                        // country change can strand an unsupported
                                        // language. Keep the current one when the
                                        // new country supports it, else fall back.
                                        handleTargetingChange({
                                          ...filters,
                                          location,
                                          language: defaultLanguageForCountry(
                                            location,
                                            filters.language,
                                          ),
                                        });
                                      }}
                                      value={filters.location}
                                    >
                                      {COUNTRY_OPTIONS.map(({ value, label }) => (
                                        <option key={value} value={value}>
                                          {label}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown
                                      aria-hidden
                                      className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[#C9C4BC]"
                                    />
                                  </span>
                                </label>
                                <label className="grid gap-1 text-[#9F9A92] text-xs">
                                  Language
                                  <span className="relative block">
                                    <select
                                      aria-label="Keyword language"
                                      className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-[#1D1D1C] py-0 pr-10 pl-3 text-[#EDE7DC] text-sm outline-none transition hover:border-white/16 focus:border-[#F2A65A]/65"
                                      onChange={(event) =>
                                        handleTargetingChange({
                                          ...filters,
                                          language: event.target.value,
                                        })
                                      }
                                      value={filters.language}
                                    >
                                      <optgroup
                                        label={`Supported in ${selectedLocation?.name ?? 'this market'} (${languageGroups.supported.length})`}
                                      >
                                        {languageGroups.supported.map(
                                          ({ value, label }) => (
                                            <option key={value} value={value}>
                                              {label}
                                            </option>
                                          ),
                                        )}
                                      </optgroup>
                                      {languageGroups.other.length > 0 ? (
                                        <optgroup label="Available with another country">
                                          {languageGroups.other.map(
                                            ({ value, label }) => (
                                              <option
                                                disabled
                                                key={value}
                                                value={value}
                                              >
                                                {label}
                                              </option>
                                            ),
                                          )}
                                        </optgroup>
                                      ) : null}
                                    </select>
                                    <ChevronDown
                                      aria-hidden
                                      className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[#C9C4BC]"
                                    />
                                  </span>
                                </label>
                                <p className="text-[#7D7870] text-[10px] leading-4">
                                  {languageGroups.supported.length} valid for{' '}
                                  {selectedLocation?.name ?? 'this market'}, {' '}
                                  {LANGUAGE_OPTIONS.length} across{' '}
                                  {COUNTRY_OPTIONS.length} markets. This pair
                                  uses {bundleEndpointTypes.length} available
                                  report sources.
                                </p>
                              </div>
                            </PopoverContent>
                          </Popover>

                          <button
                            aria-label={
                              runCostLabel
                                ? `Run research, about ${formatCents(batchCents)}`
                                : 'Run research'
                            }
                            className={cn(
                              'inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#F2A65A] px-0 font-medium text-[#17120D] text-xs transition hover:bg-[#F4B46E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2A65A]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#262625] disabled:cursor-not-allowed disabled:opacity-45 sm:h-11',
                              // Must key on whether a label renders, or the
                              // text is clipped inside a 44px icon button.
                              runCostLabel ? 'px-3 sm:px-3.5' : 'w-10 sm:w-11',
                            )}
                            disabled={isBusy || !endpointReady}
                            onClick={runResearch}
                            title={
                              bundleMode
                                ? (missingInputsHint ??
                                  `Searches every keyword source and merges the results. About ${formatCents(batchCents)}.`)
                                : (missingInputsHint ??
                                  (runCallCount > 1
                                    ? `Run ${runCallCount} endpoints, ${formatCents(batchCents)}`
                                    : 'Run'))
                            }
                            type="button"
                          >
                            {isBusy ? (
                              <Loader2 className="size-5 animate-spin" />
                            ) : (
                              <ArrowUp className="size-6" />
                            )}
                            {!isBusy && runCostLabel ? (
                              <span className="whitespace-nowrap">
                                {runCostLabel}
                              </span>
                            ) : null}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  </div>

                  {/* Advanced off is the whole point of Simple mode: no
                      endpoint picker at all, just the chat box. The bundle
                      decides what to call. Results still render below. */}
                  {/* The id lives on this stable wrapper rather than inside
                      the animated child: AnimatePresence keeps the outgoing
                      EndpointTabs mounted while the new one enters, so two
                      elements carried the same id for the length of the
                      crossfade. */}
                  <div
                    aria-expanded={advancedMode}
                    className="flex w-full flex-col items-center"
                    id="research-endpoint-tabs"
                  >
                    <AnimatePresence initial={false}>
                      {advancedMode ? (
                      <motion.div
                          animate={{ height: 'auto', opacity: 1, y: 0 }}
                          exit={{ height: 0, opacity: 0, y: -8 }}
                          initial={{ height: 0, opacity: 0, y: -8 }}
                          key={`endpoint-tabs-${commandMode}`}
                          transition={{
                            duration: reduceMotion ? 0 : 0.2,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                        >
                          <EndpointTabs
                            advanced={advancedMode}
                            endpointType={endpointState.endpointType}
                            error={endpointState.error}
                            inputs={effectiveEndpointInputs}
                            isRunning={isEndpointBusy}
                            mode={commandMode}
                            onInputsChange={handleEndpointInputsChange}
                            onEndpointToggle={handleEndpointToggle}
                            onSubcategoryChange={handleSubcategorySelect}
                            selectedTypes={endpointState.selectedTypes}
                            subcategory={endpointState.subcategory}
                          />
                      </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>

                  {isEndpointBusy && endpointState.results.length === 0 ? (
                    // The gap before the first result lands: the run is
                    // already spending, so the page must say so.
                    <div
                      className="mt-3 w-full rounded-2xl border border-white/8 border-dashed bg-[#1A1A19] py-6"
                      style={{ maxWidth: 'var(--console-measure-wide)' }}
                    >
                      <Loading label={endpointStatusText} screenHFull={false} />
                    </div>
                  ) : null}

                  {endpointState.results.length > 0 ? (
                    <div
                      className="mt-3 grid w-full min-w-0 gap-3 text-left"
                      style={{ maxWidth: 'var(--console-measure-wide)' }}
                    >
                      {endpointState.results.map((result) => (
                        <div className="min-w-0" key={result.type}>
                          {endpointState.results.length > 1 ? (
                            <p className="mb-1.5 px-1 font-medium text-[#9F9A92] text-xs">
                              {result.label}
                            </p>
                          ) : null}
                          {result.error ? (
                            <div className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-red-100 text-sm">
                              {result.error}
                            </div>
                          ) : (
                            <ResultPanel response={result.response} />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {endpointState.error ? (
                    <div className="mt-3 w-full rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-red-100 text-sm">
                      {endpointState.error}
                    </div>
                  ) : null}

                  {error ? (
                    <div className="mt-4 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-red-100 text-sm">
                      {error}
                    </div>
                  ) : null}
                </div>
              </div>
          </div>
        </div>

      </div>
    );
}

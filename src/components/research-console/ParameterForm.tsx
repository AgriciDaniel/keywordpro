'use client';

import {
  ENDPOINT_FIELD_CONFIGS,
  type EndpointCatalogEntry,
  type EndpointInputs,
  type EndpointInputValue,
} from '@/lib/research/endpoint-catalog';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  AtSign,
  Calendar,
  ClipboardCheck,
  Globe2,
  Hash,
  Languages,
  Link2,
  ListOrdered,
  MessageCircle,
  MessageSquare,
  MoveRight,
  Search,
  Sparkles,
  Tv,
  Type,
  User,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

const FIELD_ICONS: Record<string, LucideIcon> = {
  channel_id: Tv,
  comment_id: MessageSquare,
  country: Globe2,
  cursor: MoveRight,
  date_from: Calendar,
  date_to: Calendar,
  handle: AtSign,
  hashtag: Hash,
  include_clickstream_data: Users,
  keyword: Search,
  keywords: Search,
  language: Languages,
  limit: ListOrdered,
  post_id: MessageSquare,
  prompt: Sparkles,
  subreddit: MessageCircle,
  target: Globe2,
  task_id: ClipboardCheck,
  url: Link2,
  username: User,
  video_id: Video,
};

function iconFor(field: string): LucideIcon {
  return FIELD_ICONS[field] ?? Type;
}

function fieldValue(value: EndpointInputValue | undefined) {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'true' : '';
  return value == null ? '' : String(value);
}

function toggleValue(value: EndpointInputValue | undefined): boolean {
  if (typeof value === 'boolean') return value;
  return value === 'true';
}

function parseFieldValue(field: string, rawValue: string): EndpointInputValue {
  const config = ENDPOINT_FIELD_CONFIGS[field];
  if (config?.input === 'number') return Number(rawValue);
  if (config?.input === 'chips') {
    return rawValue
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return rawValue;
}

function ParameterField({
  disabled,
  field,
  onChange,
  required,
  value,
}: {
  disabled?: boolean;
  field: string;
  onChange: (field: string, value: EndpointInputValue) => void;
  required?: boolean;
  value: EndpointInputValue | undefined;
}) {
  const controlId = useId();
  const config = ENDPOINT_FIELD_CONFIGS[field] ?? {
    label: field.replace(/_/g, ' '),
    input: 'text' as const,
  };
  if (config.input === 'hidden') return null;
  const commonClass =
    'h-10 w-full rounded-xl border border-white/10 bg-[#1D1D1C] px-3 text-[#EDE7DC] text-sm outline-none transition placeholder:text-white/28 hover:border-white/16 focus:border-[#F2A65A]/65 disabled:cursor-not-allowed disabled:opacity-55';

  const Icon = iconFor(field);

  return (
    <label
      className="grid gap-1.5 text-[#9F9A92] text-xs"
      htmlFor={controlId}
    >
      <span className="inline-flex items-center gap-1.5">
        <Icon className="size-3 text-[#7D7870]" />
        {config.label}
        {required ? <span className="ml-0.5 text-[#F08A78]">*</span> : null}
      </span>
      {config.input === 'toggle' ? (
        <button
          aria-checked={toggleValue(value)}
          className={cn(
            'inline-flex h-10 w-full items-center justify-between gap-3 rounded-xl border px-3 text-left text-sm transition',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2A65A]/45',
            toggleValue(value)
              ? 'border-[#F2A65A]/45 bg-[#F2A65A]/10 text-[#EDE7DC]'
              : 'border-white/10 bg-[#1D1D1C] text-[#9F9A92] hover:border-white/16',
            disabled ? 'cursor-not-allowed opacity-55' : null,
          )}
          disabled={disabled}
          id={controlId}
          onClick={() => onChange(field, !toggleValue(value))}
          role="switch"
          type="button"
        >
          <span>{toggleValue(value) ? 'On' : 'Off'}</span>
          <span
            className={cn(
              'relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200',
              toggleValue(value) ? 'bg-[#F2A65A]' : 'bg-white/14',
            )}
          >
            <span
              className={cn(
                // See the note in EndpointTabs: pin the origin with left-0.5 so
                // the translate is measured from a known point.
                'absolute top-0.5 left-0.5 size-4 rounded-full bg-[#171512] transition-transform duration-200 ease-out',
                toggleValue(value) ? 'translate-x-4' : 'translate-x-0',
              )}
            />
          </span>
        </button>
      ) : config.input === 'textarea' ? (
        <textarea
          className={cn(commonClass, 'min-h-[82px] resize-none py-2')}
          disabled={disabled}
          id={controlId}
          onChange={(event) =>
            onChange(field, parseFieldValue(field, event.target.value))
          }
          placeholder={config.placeholder}
          value={fieldValue(value)}
        />
      ) : config.input === 'select' ? (
        <select
          className={commonClass}
          disabled={disabled}
          id={controlId}
          onChange={(event) =>
            onChange(field, parseFieldValue(field, event.target.value))
          }
          value={fieldValue(value)}
        >
          {(config.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          className={commonClass}
          disabled={disabled}
          id={controlId}
          onChange={(event) =>
            onChange(field, parseFieldValue(field, event.target.value))
          }
          placeholder={config.placeholder}
          type={config.input === 'date' ? 'date' : config.input}
          value={fieldValue(value)}
        />
      )}
      {config.helper ? (
        <span className="text-[#7D7870] text-[11px]">{config.helper}</span>
      ) : null}
    </label>
  );
}

export function ParameterForm({
  disabled,
  endpoint,
  hiddenFields,
  inputs,
  onChange,
}: {
  disabled?: boolean;
  endpoint: EndpointCatalogEntry | null;
  hiddenFields?: ReadonlySet<string>;
  inputs: EndpointInputs;
  onChange: (inputs: EndpointInputs) => void;
}) {
  // Endpoints with no required params keep their identifying input (username,
  // channel_id, place_id...) in `optional`. Collapsing that by default is what
  // made YouTube, Facebook and LinkedIn fail on first click, so open it.
  const startsExpanded = Boolean(
    endpoint && endpoint.required.length === 0 && endpoint.optional.length > 0,
  );
  const [showOptional, setShowOptional] = useState(startsExpanded);
  const lastEndpointType = useRef<string | null>(endpoint?.type ?? null);

  useEffect(() => {
    if (lastEndpointType.current !== (endpoint?.type ?? null)) {
      lastEndpointType.current = endpoint?.type ?? null;
      setShowOptional(startsExpanded);
    }
  }, [endpoint?.type, startsExpanded]);

  if (!endpoint) {
    return (
      <div className="rounded-xl border border-white/8 bg-[#1D1D1C] px-3 py-3 text-[#9F9A92] text-sm">
        Pick a sub-category above to see endpoints.
      </div>
    );
  }

  function handleFieldChange(field: string, value: EndpointInputValue) {
    onChange({ ...inputs, [field]: value });
  }

  const hidden = hiddenFields ?? new Set<string>();
  const requiredFields = endpoint.required.filter(
    (field) =>
      !hidden.has(field) && ENDPOINT_FIELD_CONFIGS[field]?.input !== 'hidden',
  );
  const optionalFields = endpoint.optional.filter(
    (field) =>
      !hidden.has(field) && ENDPOINT_FIELD_CONFIGS[field]?.input !== 'hidden',
  );
  const hasVisibleFields = requiredFields.length > 0 || optionalFields.length > 0;

  if (!endpoint.stub && !hasVisibleFields) {
    return null;
  }

  return (
    <div className="grid gap-3">
      {endpoint.stub ? (
        <div className="flex items-start gap-2 rounded-xl border border-[#F2A65A]/24 bg-[#F2A65A]/10 px-3 py-2.5 text-[#F2C48A] text-xs leading-5">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Account access required. The endpoint is visible so you can prepare
            the request, and running it will return the provider activation
            envelope.
          </span>
        </div>
      ) : null}

      {requiredFields.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {requiredFields.map((field) => (
            <ParameterField
              disabled={disabled}
              field={field}
              key={field}
              onChange={handleFieldChange}
              required
              value={inputs[field]}
            />
          ))}
        </div>
      ) : null}

      {startsExpanded ? (
        <p className="text-[#9F9A92] text-xs leading-5">
          This endpoint accepts several ways to identify the target. Fill in at
          least one.
        </p>
      ) : null}

      {optionalFields.length > 0 ? (
        <div className="grid gap-2">
          <button
            className="w-fit rounded-lg border border-white/10 px-2.5 py-1.5 text-[#9F9A92] text-xs transition hover:border-white/18 hover:text-[#EDE7DC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2A65A]/45"
            disabled={disabled}
            onClick={() => setShowOptional((value) => !value)}
            type="button"
          >
            {showOptional
              ? 'Hide optional fields'
              : startsExpanded
                ? `Choose one of ${optionalFields.length} inputs`
                : `Show ${optionalFields.length} more options`}
          </button>
          {showOptional ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {optionalFields.map((field) => (
                <ParameterField
                  disabled={disabled}
                  field={field}
                  key={field}
                  onChange={handleFieldChange}
                  value={inputs[field]}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/*
 * SPDX-License-Identifier: Apache-2.0
 */

export type EndpointCategory =
  | 'ai'
  | 'content'
  | 'keyword'
  | 'labs'
  | 'ref'
  | 'serp';

export type EndpointProvider = 'dataforseo';

export type EndpointMethod = 'DELETE' | 'GET' | 'POST';

export type EndpointInput = Record<string, unknown>;

export type ResultEnvelope = {
  success: boolean;
  type: string;
  count: number;
  results: unknown;
  note?: string;
  cost?: number;
  meta?: Record<string, unknown>;
};

export type EndpointDef = {
  type: string;
  category: EndpointCategory;
  endpoint: string;
  method: EndpointMethod;
  urlSuffix: string;
  urlTemplate?: string;
  api: EndpointProvider;
  buildBody: (input: EndpointInput) => unknown;
  project: (
    response: unknown,
    type: string,
    input: EndpointInput,
  ) => unknown;
  resultIsArray: boolean;
  description: string;
  required: string[];
  optional: string[];
  stub: boolean;
  stubReason?: string;
  bodySource?: string;
  projectorSource?: string;
};

export type SanitizedEndpointDef = Omit<
  EndpointDef,
  'bodySource' | 'buildBody' | 'project' | 'projectorSource'
>;

export type BYOKContext = {
  userId?: string;
  dataforseoCredentials?: Array<{ login: string; password: string }>;
};

export type CostEstimate = {
  estimatedCents: number;
  notes?: string;
};

export type ResearchCallOptions = {
  type: string;
  input: EndpointInput;
  credentials: BYOKContext;
  billingMode?: 'platform' | 'byok';
  sandbox?: boolean;
  timeoutMs?: number;
  userId?: string;
  requestId?: string;
  reservationId?: string;
};

export type ResearchByokInput = {
  userId?: string;
  dataforseo?: {
    login: string;
    password: string;
  };
};

export type DispatchResearchOptions = {
  endpointId: string;
  params: EndpointInput;
  billingMode?: 'platform' | 'byok';
  byok?: ResearchByokInput;
  sandbox?: boolean;
  timeoutMs?: number;
  requestId?: string;
  reservationId?: string;
};

export type DispatchResearchResult = {
  ok: true;
  data: unknown;
  cost: number;
  raw: unknown;
  projector_version: string;
};

export type CanonicalCoverageReport = {
  totalCanonicalPaths: number;
  coveredCanonicalPaths: number;
  uncoveredCanonicalPaths: string[];
};

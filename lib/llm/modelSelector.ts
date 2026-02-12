const DEFAULT_MODEL_CHAIN = [
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "openrouter/free",
  "qwen/qwen-2.5-7b-instruct",
] as const;

const ATTEMPT_TYPES = [
  "free_primary",
  "free_secondary",
  "paid_fallback",
] as const;

export type ModelAttemptType = (typeof ATTEMPT_TYPES)[number];

export interface ProviderRoutingPolicy {
  sort: "throughput";
  require_parameters: true;
  allow_fallbacks: false;
}

export interface ModelAttemptPolicy {
  attemptType: ModelAttemptType;
  model: string;
  providerRouting?: ProviderRoutingPolicy;
}

export interface ModelSelectionCriteria {
  contentLength: number;
  sourceType: string;
  requestCount: number;
}

const DEFAULT_FREE_PROVIDER_ROUTING: ProviderRoutingPolicy = {
  sort: "throughput",
  require_parameters: true,
  allow_fallbacks: false,
};

function parseAllowedModelsOverride(): string[] | null {
  const raw = process.env.LLM_ALLOWED_MODELS;
  if (!raw) return null;

  const models = raw
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  // Compatibility override requires all three tiers.
  return models.length >= 3 ? models.slice(0, 3) : null;
}

function resolveConfiguredModelChain(): string[] {
  const overrideModels = parseAllowedModelsOverride();
  if (overrideModels) return overrideModels;

  return [
    process.env.LLM_FREE_PRIMARY_MODEL || DEFAULT_MODEL_CHAIN[0],
    process.env.LLM_FREE_SECONDARY_MODEL || DEFAULT_MODEL_CHAIN[1],
    process.env.LLM_PAID_FALLBACK_MODEL || DEFAULT_MODEL_CHAIN[2],
  ];
}

function toAttemptPolicy(models: string[]): ModelAttemptPolicy[] {
  return models.slice(0, ATTEMPT_TYPES.length).map((model, index) => ({
    attemptType: ATTEMPT_TYPES[index]!,
    model,
    ...(model === "openrouter/free"
      ? { providerRouting: DEFAULT_FREE_PROVIDER_ROUTING }
      : {}),
  }));
}

/**
 * Returns ordered model attempts with tier metadata.
 */
export function selectModelCandidates(
  _criteria: ModelSelectionCriteria
): ModelAttemptPolicy[] {
  return toAttemptPolicy(resolveConfiguredModelChain());
}

export function getHealthcheckModel(): string {
  return resolveConfiguredModelChain()[0] || DEFAULT_MODEL_CHAIN[0];
}

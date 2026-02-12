import { createLogger } from "./logger";

const logger = createLogger("Env:Validator");

interface EnvVar {
  name: string;
  required: boolean;
}

const BASE_ENV_VARS: EnvVar[] = [
  { name: "LLM_PROVIDER", required: false },
  { name: "DATABASE_URL", required: false },
  { name: "KV_REST_API_URL", required: false },
  { name: "KV_REST_API_TOKEN", required: false },
  { name: "YOUTUBE_API_KEY", required: false },
  { name: "NEXT_PUBLIC_APP_URL", required: false },
  { name: "STRIPE_SECRET_KEY", required: false },
  { name: "NEXT_PUBLIC_ADSENSE_CLIENT_ID", required: false },
  { name: "LLM_MAX_MONTHLY_SPEND_USD", required: false },
  { name: "LLM_ALLOWED_MODELS", required: false },
];

export function validateEnvironment(): void {
  const provider = (process.env.LLM_PROVIDER || "openrouter").toLowerCase();
  const providerVars: EnvVar[] = [];

  if (provider === "openrouter") {
    providerVars.push({ name: "OPENROUTER_API_KEY", required: true });
  }

  const envVars = [...BASE_ENV_VARS, ...providerVars];
  const missing: string[] = [];
  const optional: string[] = [];

  for (const envVar of envVars) {
    if (!process.env[envVar.name]) {
      if (envVar.required) {
        missing.push(envVar.name);
      } else {
        optional.push(envVar.name);
      }
    }
  }

  if (optional.length > 0) {
    logger.info("Optional environment variables not set", {
      vars: optional,
    });
  }

  if (missing.length > 0) {
    logger.error("Required environment variables missing", {
      vars: missing,
    });
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  logger.info("Environment validation passed");
}

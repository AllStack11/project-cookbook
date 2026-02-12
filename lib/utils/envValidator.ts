import { createLogger } from "./logger";

const logger = createLogger("Env:Validator");

interface EnvVar {
  name: string;
  required: boolean;
}

const ENV_VARS: EnvVar[] = [
  { name: "GEMINI_API_KEY", required: true },
  { name: "DATABASE_URL", required: false },
  { name: "KV_REST_API_URL", required: false },
  { name: "KV_REST_API_TOKEN", required: false },
  { name: "YOUTUBE_API_KEY", required: false },
  { name: "NEXT_PUBLIC_APP_URL", required: false },
  { name: "STRIPE_SECRET_KEY", required: false },
  { name: "NEXT_PUBLIC_ADSENSE_CLIENT_ID", required: false },
];

export function validateEnvironment(): void {
  const missing: string[] = [];
  const optional: string[] = [];

  for (const envVar of ENV_VARS) {
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

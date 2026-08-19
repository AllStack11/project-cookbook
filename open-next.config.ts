// open-next.config.ts - see docs/architecture/stack-decision.md, operations.md
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

export default defineCloudflareConfig({
	// Uses the NEXT_INC_CACHE_R2_BUCKET binding declared per-environment in
	// wrangler.jsonc. https://opennext.js.org/cloudflare/caching
	incrementalCache: r2IncrementalCache,
});

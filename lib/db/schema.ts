import {
  pgTable,
  serial,
  text,
  integer,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

import { boolean } from "drizzle-orm/pg-core";

export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  sourceUrl: text("source_url"),
  sourcePlatform: text("source_platform"), // youtube, blog, instagram, etc
  confidenceScore: integer("confidence_score"),
  data: jsonb("data").notNull(), // Full Recipe object

  // User Metadata
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  country: text("country"),
  region: text("region"),
  isSuspicious: boolean("is_suspicious").default(false),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

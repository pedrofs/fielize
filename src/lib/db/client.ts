import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

const queryClient = postgres(env.POSTGRES_URL, { prepare: false });

export const db = drizzle(queryClient, { schema, casing: "snake_case" });

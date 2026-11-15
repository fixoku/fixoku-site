import type { Pool, PoolClient } from "pg";

type QueryClient = Pool | PoolClient;
export function queueVerifiedOwnerRegistration(client: QueryClient, authUserId: string, env?: NodeJS.ProcessEnv): Promise<number>;
export function queueOwnerManagementEmail(client: QueryClient, input: { templateKey: string; eventId: string; metadata: Record<string, unknown> }, env?: NodeJS.ProcessEnv): Promise<unknown>;

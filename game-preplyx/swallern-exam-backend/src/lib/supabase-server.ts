import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | undefined;

/** Uses only the public anon key. RLS governs all reads exposed by this API. */
export function getExamDatabase(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !publishableKey) {
    throw new Error("Exam Supabase URL and publishable/anon key are not configured on the server.");
  }

  cachedClient = createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "X-Swallern-Platform": "exam-api" } },
  });
  return cachedClient;
}

export async function selectAll<T extends Record<string, unknown>>(
  table: string,
  columns: string,
  configure?: (query: any) => any,
): Promise<T[]> {
  const client = getExamDatabase();
  const output: T[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    let query = client.from(table).select(columns);
    if (configure) query = configure(query) as typeof query;
    const { data, error } = await query.range(offset, offset + pageSize - 1);
    if (error) throw error;
    const page = (data ?? []) as unknown as T[];
    output.push(...page);
    if (page.length < pageSize) return output;
  }
}

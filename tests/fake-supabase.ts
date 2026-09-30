import { vi } from "vitest";

// A minimal stand-in for the Supabase client used by Server Actions.
// Every query is recorded in `calls`; `respond` decides what each one returns.

export type Call = {
  table?: string;
  rpc?: string;
  op: "select" | "insert" | "update" | "delete" | "upsert" | "rpc";
  payload?: unknown;
  filters: [string, ...unknown[]][];
};

export type Result = { data?: unknown; error?: { code?: string; message: string } | null; count?: number };

export function fakeSupabase(respond: (call: Call) => Result = () => ({ data: null, error: null })) {
  const calls: Call[] = [];

  function builder(call: Call) {
    calls.push(call);
    const settle = () => {
      const r = respond(call);
      return { data: r.data ?? null, error: r.error ?? null, count: r.count ?? null };
    };
    const b: Record<string, unknown> = {
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve(settle()).then(resolve, reject),
    };
    // Mutations followed by .select() keep their op; plain .select() sets it.
    b.select = (cols?: string) => {
      if (!call.op || call.op === "select") call.op = "select";
      call.filters.push(["select", cols]);
      return b;
    };
    for (const op of ["insert", "update", "delete", "upsert"] as const) {
      b[op] = (payload?: unknown) => {
        call.op = op;
        call.payload = payload;
        return b;
      };
    }
    for (const f of ["eq", "neq", "in", "is", "ilike", "contains", "order", "limit", "range"]) {
      b[f] = (...args: unknown[]) => {
        call.filters.push([f, ...args]);
        return b;
      };
    }
    b.single = b.maybeSingle = () => b;
    return b;
  }

  const storageRemove = vi.fn<(paths: string[]) => Promise<{ data: unknown[]; error: { message: string } | null }>>(
    async () => ({ data: [], error: null }),
  );

  const client = {
    from: (table: string) => builder({ table, op: "select", filters: [] }),
    storage: {
      from: (bucket: string) => ({
        remove: (paths: string[]) => {
          calls.push({ table: `storage:${bucket}`, op: "delete", payload: paths, filters: [] });
          return storageRemove(paths);
        },
      }),
    },
    rpc: (name: string, args: unknown) => builder({ rpc: name, op: "rpc", payload: args, filters: [] }),
    auth: {
      getClaims: vi.fn(async () => ({ data: { claims: { sub: "user-1" } }, error: null })),
      signUp: vi.fn(async () => ({ data: { session: null, user: { id: "user-1" } }, error: null })),
      signInWithPassword: vi.fn(async () => ({ data: {}, error: null })),
      signInWithOAuth: vi.fn(async () => ({ data: { url: "https://accounts.google.com/o" }, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
    },
  };

  return { client, calls, storageRemove };
}

// next/navigation's redirect() and notFound() throw to stop rendering; mirror that.
export class RedirectSignal extends Error {
  constructor(public url: string) {
    super(`REDIRECT ${url}`);
  }
}
export class NotFoundSignal extends Error {
  constructor() {
    super("NOT_FOUND");
  }
}

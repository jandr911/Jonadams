import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

export async function sessionSupabase() {
  await connection();
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch (error) {
          // Server Components cannot write cookies; proxy.ts refreshes the session on every /admin request instead.
          if (error instanceof Error && /Server Action|Route Handler/.test(error.message)) return;
          throw error;
        }
      },
    },
  });
}

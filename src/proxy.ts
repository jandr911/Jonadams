import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { IN_DEVELOPMENT } from "@/content/site";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

const LOGIN = "/admin/login";

export async function proxy(request: NextRequest) {
  if (IN_DEVELOPMENT) return NextResponse.rewrite(new URL("/in-development", request.url));
  if (!request.nextUrl.pathname.startsWith("/admin")) return NextResponse.next();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const onLogin = request.nextUrl.pathname === LOGIN;
  if (!user && !onLogin) return NextResponse.redirect(new URL(LOGIN, request.url));
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|keep-awake|icon.svg).*)"] };

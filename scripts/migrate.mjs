import { execFileSync } from "node:child_process";

const env = process.env;
const skip = (why) => {
  console.log(`Supabase migration skipped: ${why}.`);
  process.exit(0);
};

if (!env.VERCEL) skip("not a Vercel build");
if (!env.SUPABASE_ACCESS_TOKEN || !env.SUPABASE_DB_PASSWORD) skip("SUPABASE_ACCESS_TOKEN or SUPABASE_DB_PASSWORD not set");

const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL ?? "");
const ref = url.hostname.split(".")[0];
if (!ref) skip("NEXT_PUBLIC_SUPABASE_URL is not a Supabase project URL");

const supabase = (...args) => execFileSync("npx", ["-y", "supabase@2", ...args], { stdio: "inherit", env });

console.log(`Applying migrations to ${ref}…`);
supabase("link", "--project-ref", ref);
supabase("db", "push");

const management = async (path, body) => {
  const res = await fetch(`https://api.supabase.com/v1${path}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} failed: ${res.status} ${await res.text()}`);
};

await management(`/projects/${ref}/config/auth`, { disable_signup: true });
console.log("Public sign-ups disabled.");

if (env.SUPABASE_SERVICE_ROLE_KEY && env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
  const res = await fetch(`${url.origin}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD, email_confirm: true }),
  });
  const text = await res.text();
  if (res.ok) console.log(`Owner login created for ${env.ADMIN_EMAIL}.`);
  else if (res.status === 422 && /already/i.test(text)) console.log(`Owner login already exists for ${env.ADMIN_EMAIL}.`);
  else throw new Error(`Owner login failed: ${res.status} ${text}`);
} else {
  console.log("Owner login skipped: SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL or ADMIN_PASSWORD not set.");
}

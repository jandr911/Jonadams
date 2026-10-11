import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const env = process.env;
const skip = (why) => {
  console.log(`Supabase migration skipped: ${why}.`);
  process.exit(0);
};

if (!env.VERCEL) skip("not a Vercel build");
if (!env.SUPABASE_ACCESS_TOKEN) skip("SUPABASE_ACCESS_TOKEN not set");

const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL ?? "");
const ref = url.hostname.split(".")[0];
if (!ref) skip("NEXT_PUBLIC_SUPABASE_URL is not a Supabase project URL");

const API = "https://api.supabase.com/v1";

async function management(method, route, body) {
  const res = await fetch(`${API}${route}`, {
    method,
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${route} failed: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

const query = (sql) => management("POST", `/projects/${ref}/database/query`, { query: sql });

await query(
  "create schema if not exists supabase_migrations; create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);",
);
const applied = new Set((await query("select version from supabase_migrations.schema_migrations")).map((r) => r.version));

const dir = path.join(process.cwd(), "supabase", "migrations");
const files = (await readdir(dir)).filter((f) => /^\d+_.*\.sql$/.test(f)).sort();
for (const file of files) {
  const version = file.split("_")[0];
  if (applied.has(version)) continue;
  console.log(`Applying ${file} to ${ref}…`);
  await query(await readFile(path.join(dir, file), "utf8"));
  const name = file.slice(version.length + 1, -4).replace(/'/g, "''");
  await query(`insert into supabase_migrations.schema_migrations (version, name) values ('${version}', '${name}') on conflict do nothing`);
}
console.log(`Migrations up to date (${files.length} on disk).`);

await management("PATCH", `/projects/${ref}/config/auth`, { disable_signup: true });
console.log("Public sign-ups disabled.");

if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
  const keys = await management("GET", `/projects/${ref}/api-keys?reveal=true`);
  const secret = keys.find((k) => k.type === "secret" || k.name === "service_role")?.api_key;
  if (!secret) throw new Error("No secret API key found for the project");
  const res = await fetch(`${url.origin}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: secret, Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD, email_confirm: true }),
  });
  const text = await res.text();
  if (res.ok) console.log(`Owner login created for ${env.ADMIN_EMAIL}.`);
  else if (res.status === 422 && /already/i.test(text)) console.log(`Owner login already exists for ${env.ADMIN_EMAIL}.`);
  else throw new Error(`Owner login failed: ${res.status} ${text}`);
} else {
  console.log("Owner login skipped: ADMIN_EMAIL or ADMIN_PASSWORD not set.");
}

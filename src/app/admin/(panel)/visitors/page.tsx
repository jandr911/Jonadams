import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import AdminHead from "@/components/admin/AdminHead";
import {
  RANGES,
  analyticsConfigured,
  analyticsEnv,
  cityEntries,
  daily,
  districtFlights,
  liveVisitors,
  pages,
  parseRange,
  sessionsBy,
  songEvents,
  songPositions,
  totals,
  videoPlays,
  visitorsBy,
  type Range,
  type Row,
  type Settled,
} from "@/lib/analytics/ga";

export const metadata: Metadata = { title: "Visitors" };

type SearchParams = Promise<{ range?: string }>;

const count = (n: number) => n.toLocaleString("en-US");

function duration(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function day(yyyymmdd: string): string {
  const d = new Date(Date.UTC(Number(yyyymmdd.slice(0, 4)), Number(yyyymmdd.slice(4, 6)) - 1, Number(yyyymmdd.slice(6, 8))));
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "UTC" });
}

function label(value: string): string {
  return value === "(not set)" || value === "unknown" || value === "" ? "Unknown" : value;
}

const SONG_LABELS: Record<string, string> = { song_play: "Played", song_pause: "Paused", song_stop: "Stopped" };

function Problem({ error }: { error: string }) {
  const needsSetup = error.includes("customEvent:");
  return (
    <p className="admin-status is-error">
      {needsSetup ? "Needs a custom definition in Google Analytics (see the setup notes below). " : ""}
      {error}
    </p>
  );
}

function Stat({ label: name, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="admin-stat">
      <span className="admin-stat__value">{value}</span>
      <span className="admin-stat__label">{name}</span>
      {hint && <span className="admin-stat__hint">{hint}</span>}
    </div>
  );
}

interface RankedProps {
  title: string;
  lede?: string;
  result: Settled<Row[]>;
  name?: (row: Row) => string;
  sub?: (row: Row) => string | undefined;
  unit: string;
  empty?: string;
}

function Ranked({ title, lede, result, name = (r) => label(r.dims[0]), sub, unit, empty = "Nothing yet." }: RankedProps) {
  const rows = result.value ?? [];
  const max = Math.max(1, ...rows.map((r) => r.values[0]));
  return (
    <section className="admin-card">
      <h2 className="admin-card__title">{title}</h2>
      {lede && <p className="admin-note">{lede}</p>}
      {result.error ? (
        <Problem error={result.error} />
      ) : rows.length === 0 ? (
        <p className="admin-empty">{empty}</p>
      ) : (
        <ol className="admin-rank">
          {rows.map((r, i) => {
            const extra = sub?.(r);
            return (
              <li key={i}>
                <span className="admin-rank__name">{name(r)}</span>
                <span className="admin-rank__count">
                  {count(r.values[0])} {unit}
                </span>
                {extra && <span className="admin-rank__sub">{extra}</span>}
                <span className="admin-rank__bar" aria-hidden>
                  <i style={{ width: `${(r.values[0] / max) * 100}%` }} />
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function fillDays(rows: Row[], range: Range): Row[] {
  const byDate = new Map(rows.filter((r) => /^\d{8}$/.test(r.dims[0])).map((r) => [r.dims[0], r]));
  const today = new Date();
  return Array.from({ length: range }, (_, i) => {
    const d = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() - (range - 1 - i)));
    const key = d.toISOString().slice(0, 10).replace(/-/g, "");
    return byDate.get(key) ?? { dims: [key], values: [0, 0] };
  });
}

function Chart({ result, range }: { result: Settled<Row[]>; range: Range }) {
  const rows = result.value ? fillDays(result.value, range) : [];
  const max = Math.max(1, ...rows.map((r) => r.values[0]));
  return (
    <section className="admin-card">
      <h2 className="admin-card__title">Visitors by day</h2>
      {result.error ? (
        <Problem error={result.error} />
      ) : rows.length === 0 ? (
        <p className="admin-empty">Nothing yet.</p>
      ) : (
        <>
          <div className="admin-chart" role="img" aria-label="Visitors per day">
            {rows.map((r) => (
              <i key={r.dims[0]} style={{ height: `${(r.values[0] / max) * 100}%` }} title={`${day(r.dims[0])}: ${count(r.values[0])} visitors, ${count(r.values[1])} visits`} />
            ))}
          </div>
          <div className="admin-chart__axis">
            <span>{day(rows[0].dims[0])}</span>
            <span>{day(rows[rows.length - 1].dims[0])}</span>
          </div>
        </>
      )}
    </section>
  );
}

function Setup() {
  const env = analyticsEnv();
  const keys: [string, string, string][] = [
    ["NEXT_PUBLIC_GA_MEASUREMENT_ID", env.measurementId, "The Measurement ID of the web stream, like G-XXXXXXXXXX. This one switches tracking on for visitors."],
    ["GA_PROPERTY_ID", env.property, "The numeric Property ID from Admin → Property details."],
    ["GA_CLIENT_EMAIL", env.email, "The service account's email address."],
    ["GA_PRIVATE_KEY", env.key, "The private_key line from the service account's JSON key file."],
  ];
  return (
    <>
      <AdminHead title="Visitors" lede="Google Analytics is not connected yet. Once the four values below are set, this page shows who visits, from where, and what they play." />
      <div className="admin-stack">
        <section className="admin-card">
          <h2 className="admin-card__title">Values to set</h2>
          <p className="admin-note">In Vercel under Settings → Environment Variables, for Production and Preview, and in .env.local on the development machine.</p>
          <ol className="admin-rank">
            {keys.map(([name, value, note]) => (
              <li key={name}>
                <span className="admin-rank__name">
                  <code>{name}</code>
                </span>
                <span className="admin-rank__count">{value ? "set" : "missing"}</span>
                <span className="admin-rank__sub">{note}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="admin-card">
          <h2 className="admin-card__title">How to get them</h2>
          <ol className="admin-steps">
            <li>In Google Analytics, create a property for the site with a web data stream, and copy its Measurement ID.</li>
            <li>In Google Cloud Console, create a project, enable the “Google Analytics Data API”, create a service account, and download a JSON key for it.</li>
            <li>Back in Google Analytics, open Admin → Property access management and add the service account’s email as a Viewer.</li>
            <li>Copy the numeric Property ID from Admin → Property details.</li>
            <li>Redeploy after setting the values. Visitor numbers take up to a day to appear; the live count is immediate.</li>
          </ol>
        </section>
        <SetupNotes />
      </div>
    </>
  );
}

function SetupNotes() {
  return (
    <details className="admin-card admin-card--quiet">
      <summary className="admin-card__title">Setup notes for the detailed numbers</summary>
      <ul className="admin-steps">
        <li>
          Age and gender show only after Admin → Data collection → Google signals is switched on, and only once there are enough visitors for Google to share
          them.
        </li>
        <li>
          For the videos, districts, waiting time and song position, add these in Admin → Custom definitions. Event-scoped dimensions:{" "}
          <code>video_title</code> and <code>district</code>. Event-scoped metrics: <code>wait_seconds</code> and <code>position_seconds</code>, both as
          standard numbers. Google starts counting them from the moment they are added.
        </li>
        <li>Visits from a browser that has signed in here are not counted, so your own visits stay out of the numbers.</li>
      </ul>
    </details>
  );
}

function RangeSwitch({ range }: { range: Range }) {
  return (
    <nav className="admin-range" aria-label="Time range">
      {RANGES.map((r) => (
        <Link key={r} href={`/admin/visitors?range=${r}`} className={`admin-btn ${r === range ? "admin-btn--primary" : "admin-btn--quiet"}`} aria-current={r === range ? "page" : undefined}>
          Last {r} days
        </Link>
      ))}
    </nav>
  );
}

export default function VisitorsAdmin({ searchParams }: { searchParams: SearchParams }) {
  if (!analyticsConfigured()) return <Setup />;
  return (
    <Suspense fallback={<AdminHead title="Visitors" lede="Fetching the numbers from Google…" />}>
      <Report searchParams={searchParams} />
    </Suspense>
  );
}

async function Report({ searchParams }: { searchParams: SearchParams }) {
  const range = parseRange((await searchParams).range);
  const [live, sums, byDay, byPage, countries, cities, ages, genders, devices, sources, song, positions, videos, districts, entries] = await Promise.all([
    liveVisitors(),
    totals(range),
    daily(range),
    pages(range),
    visitorsBy(range, "country"),
    visitorsBy(range, "city"),
    visitorsBy(range, "userAgeBracket", 10),
    visitorsBy(range, "userGender", 5),
    visitorsBy(range, "deviceCategory", 5),
    sessionsBy(range, "sessionSourceMedium"),
    songEvents(range),
    songPositions(range),
    videoPlays(range),
    districtFlights(range),
    cityEntries(range),
  ]);

  const t = sums.value?.[0]?.values ?? [0, 0, 0, 0, 0, 0];
  const [visitors, newVisitors, visits, pageViews, engagementSeconds, engagedVisits] = t;
  const entry = entries.value?.[0]?.values;
  const positionRows = positions.value ?? [];

  return (
    <>
      <AdminHead title="Visitors" lede={`Who comes to the site, where they are, and what they play. Numbers cover the last ${range} days and refresh about once an hour.`} />
      <div className="admin-stack">
        <RangeSwitch range={range} />
        {sums.error && <Problem error={sums.error} />}
        {live.error && <Problem error={live.error} />}
        <div className="admin-stats">
          <Stat label="Right now" value={live.value === undefined ? "–" : count(live.value)} hint="people on the site this minute" />
          <Stat label="Visitors" value={count(visitors)} hint={`${count(newVisitors)} for the first time`} />
          <Stat label="Visits" value={count(visits)} hint={`${count(engagedVisits)} stayed and looked around`} />
          <Stat label="Pages opened" value={count(pageViews)} />
          <Stat label="Time per visitor" value={visitors ? duration(engagementSeconds / visitors) : "–"} hint="average time spent on the site" />
        </div>
        <Chart result={byDay} range={range} />
        <div className="admin-grid">
          <Ranked title="Pages opened" result={byPage} name={(r) => (label(r.dims[1]) === "Unknown" ? r.dims[0] : r.dims[1].replace(/ · .*$/, ""))} sub={(r) => `${r.dims[0]} · ${count(r.values[1])} people`} unit="opens" />
          <Ranked title="Countries" result={countries} unit="visitors" />
          <Ranked title="Cities" result={cities} unit="visitors" />
          <Ranked title="Age" result={ages} unit="visitors" empty="Not enough visitors yet, or Google signals is off (see the setup notes below)." />
          <Ranked title="Gender" result={genders} unit="visitors" empty="Not enough visitors yet, or Google signals is off (see the setup notes below)." />
          <Ranked title="Devices" result={devices} unit="visitors" />
          <Ranked title="Where they came from" result={sources} unit="visits" />
        </div>
        <section className="admin-card">
          <h2 className="admin-card__title">The site song</h2>
          {song.error ? (
            <Problem error={song.error} />
          ) : (
            <div className="admin-stats">
              {(["song_play", "song_pause", "song_stop"] as const).map((name) => {
                const row = song.value?.find((r) => r.dims[0] === name);
                return <Stat key={name} label={SONG_LABELS[name]} value={count(row?.values[0] ?? 0)} hint={`by ${count(row?.values[1] ?? 0)} people`} />;
              })}
              {positions.error ? (
                <Problem error={positions.error} />
              ) : (
                positionRows.map((r) => (
                  <Stat key={r.dims[0]} label={`${SONG_LABELS[r.dims[0]]} at`} value={r.values[0] ? duration(r.values[1] / r.values[0]) : "–"} hint="average point in the track" />
                ))
              )}
            </div>
          )}
        </section>
        <div className="admin-grid">
          <Ranked title="Videos played" result={videos} sub={(r) => `${count(r.values[1])} people`} unit="plays" empty="No video has been played yet." />
          <Ranked title="Districts flown to" result={districts} sub={(r) => `${count(r.values[1])} people`} unit="flights" empty="Nobody has used the district bar yet." />
          <section className="admin-card">
            <h2 className="admin-card__title">The loading screen</h2>
            {entries.error ? (
              <Problem error={entries.error} />
            ) : (
              <div className="admin-stats">
                <Stat label="Entered the city" value={count(entry?.[0] ?? 0)} hint={`${count(entry?.[1] ?? 0)} people`} />
                <Stat label="Waited" value={entry?.[0] ? duration(entry[2] / entry[0]) : "–"} hint="average time on the loading screen" />
              </div>
            )}
          </section>
        </div>
        <SetupNotes />
      </div>
    </>
  );
}

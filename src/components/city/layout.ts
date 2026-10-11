export const BLOCK = 20;
export const ROAD = 11;
export const PITCH = BLOCK + ROAD;
export const ROAD_HALF = ROAD / 2;
export const LANE_OFFSET = 1.3;
export const MEDIAN_LANE_OFFSET = 2.4;
export const KERB_PARK_OFFSET = 2.2;
export const CROSSWALK_OFFSET = ROAD_HALF + 1.1;
export const CORNER_OFFSET = ROAD_HALF + 0.7;
export const COLS = 9;
export const ROWS = 6;

export const CITY_HALF_X = (COLS * PITCH) / 2;
export const CITY_HALF_Z = (ROWS * PITCH) / 2;
export const RIVERWALK_HALF = CITY_HALF_X + 40;
export const PAD = 0.4;

export const RIVER_NEAR = CITY_HALF_Z + 12;
export const RIVER_FAR = RIVER_NEAR + 70;

export const CAMERA_CEILING = 250;

export const HOVER_SCALE = 1.05;
export const LABEL_FADE_MS = 340;
export const LABEL_FADE_STYLE = { ["--fade" as string]: `${LABEL_FADE_MS}ms` };

export const AMBASSADOR_X = -186;
export const AMBASSADOR_CLEAR_HALF = 9;
export const AMBASSADOR_RAMP_Z = [-23, RIVER_FAR + 125] as const;

const HOME_CAMERA = {
  position: [0, 62, CITY_HALF_Z + 206] as [number, number, number],
  target: [0, 28, -10] as [number, number, number],
};

const HOME_FOV = 40;
const PORTRAIT_HOME_CAMERA = {
  position: [0, 50, CITY_HALF_Z + 150] as [number, number, number],
  target: [0, 22, -10] as [number, number, number],
};
const PORTRAIT_FOV = 56;

export function homeCamera(aspect: number) {
  return aspect < 1 ? { ...PORTRAIT_HOME_CAMERA, fov: PORTRAIT_FOV } : { ...HOME_CAMERA, fov: HOME_FOV };
}

export const INTRO_CAMERA = {
  position: [-260, 200, CITY_HALF_Z + 372] as [number, number, number],
  target: [0, 20, 0] as [number, number, number],
};

export function blockCenter(col: number, row: number): [number, number] {
  return [
    -CITY_HALF_X + PITCH / 2 + col * PITCH,
    -CITY_HALF_Z + PITCH / 2 + row * PITCH,
  ];
}

export const OUTER_ROWS = 8;
export const OUTER_COLS = 6;
export const OUTER_HALF_X = CITY_HALF_X + OUTER_COLS * PITCH;
export const OUTER_MIN_Z = -CITY_HALF_Z - OUTER_ROWS * PITCH;

export function allBlocks(): { c: number; r: number; outer: boolean }[] {
  const out: { c: number; r: number; outer: boolean }[] = [];
  for (let r = -OUTER_ROWS; r < ROWS; r++) {
    for (let c = -OUTER_COLS; c < COLS + OUTER_COLS; c++) {
      const outer = r < 0 || c < 0 || c >= COLS;
      out.push({ c, r, outer });
    }
  }
  return out;
}

export function outerRoadLinesX(): number[] {
  const xs: number[] = [];
  for (let c = -OUTER_COLS; c <= COLS + OUTER_COLS; c++) xs.push(-CITY_HALF_X + c * PITCH);
  return xs;
}

export function outerRoadLinesZ(): number[] {
  const zs: number[] = [];
  for (let r = -OUTER_ROWS; r <= ROWS; r++) zs.push(-CITY_HALF_Z + r * PITCH);
  return zs;
}

const LIGHT_CYCLE = 16;
export const TRAFFIC_CLOCK = { time: 0 };
const GREEN_UNTIL = 0.35;
const AMBER_UNTIL = 0.42;

function lightPhase(axis: "x" | "z", ix: number, iz: number, time: number) {
  const cycle = (time % LIGHT_CYCLE) / LIGHT_CYCLE;
  const offset = (((ix * 0.371 + iz * 0.613) % 1) + 1) % 1;
  const phase = offset + (axis === "x" ? 0.5 : 0);
  return (cycle + phase) % 1;
}

export function lightIsGreen(axis: "x" | "z", ix: number, iz: number, time: number): boolean {
  return lightPhase(axis, ix, iz, time) < GREEN_UNTIL;
}

export function lightIsAmber(axis: "x" | "z", ix: number, iz: number, time: number): boolean {
  const c = lightPhase(axis, ix, iz, time);
  return c >= GREEN_UNTIL && c < AMBER_UNTIL;
}

export function nearIntersection(v: number, half: number): boolean {
  const m = (((v + half) % PITCH) + PITCH) % PITCH;
  return Math.abs(m - PITCH / 2) < ROAD_HALF + 0.5;
}

export function roadLinesX(): number[] {
  const xs: number[] = [];
  for (let c = 0; c <= COLS; c++) xs.push(-CITY_HALF_X + c * PITCH);
  return xs;
}

export const PEOPLE_MOVER_X = [2, 7];
export const PEOPLE_MOVER_Z = [1, 5];

export function roadLinesZ(): number[] {
  const zs: number[] = [];
  for (let r = 0; r <= ROWS; r++) zs.push(-CITY_HALF_Z + r * PITCH);
  return zs;
}

const MEDIAN_X = PEOPLE_MOVER_X.map((i) => roadLinesX()[i]);
const MEDIAN_Z = PEOPLE_MOVER_Z.map((i) => roadLinesZ()[i]);

export function isMedianLine(axis: "x" | "z", line: number) {
  return (axis === "x" ? MEDIAN_X : MEDIAN_Z).some((m) => Math.abs(m - line) < 0.01);
}

export interface Destination {
  id: string;
  href: string;
  label: string;
  sub: string;
  blurb: string;
  color: string;
  accent: string;
  block: [number, number];
  view: { from: [number, number, number]; at: [number, number, number] };
  markerHeight: number;
}

export const DESTINATIONS: Destination[] = [
  {
    id: "club",
    href: "/club",
    label: "Club Adams",
    sub: "Riverfront Tower",
    blurb: "The front door: four walls, four ways deeper in",
    color: "#ff4fa3",
    accent: "var(--pink)",
    block: [5, 5],
    view: { from: [16, 34, 66], at: [0, 30, 0] },
    markerHeight: 78,
  },
  {
    id: "listen",
    href: "/listen",
    label: "Listen",
    sub: "Fox Theatre",
    blurb: "Singles, the latest release and a live session",
    color: "#ffb02e",
    accent: "var(--amber)",
    block: [1, 5],
    view: { from: [6, 20, 48], at: [0, 18, 0] },
    markerHeight: 46,
  },
  {
    id: "watch",
    href: "/listen#watch",
    label: "Watch",
    sub: "Michigan Central",
    blurb: "Official videos and behind the scenes",
    color: "#49f2d6",
    accent: "var(--cyan)",
    block: [0, 5],
    view: { from: [10, 26, 58], at: [0, 24, 0] },
    markerHeight: 56,
  },
  {
    id: "merch",
    href: "/merch",
    label: "Merch",
    sub: "Rivertown Warehouse",
    blurb: "Tees, hoodies, caps and numbered prints",
    color: "#49d2f2",
    accent: "var(--blue)",
    block: [6, 5],
    view: { from: [-8, 16, 44] , at: [0, 12, 0] },
    markerHeight: 34,
  },
  {
    id: "creatives",
    href: "/creatives",
    label: "The Creatives",
    sub: "Corktown Billboard",
    blurb: "A curated wall of Detroit makers, picked by Jonathan",
    color: "#c9a6ff",
    accent: "var(--violet)",
    block: [2, 4],
    view: { from: [4, 22, 44], at: [0, 20, 0] },
    markerHeight: 34,
  },
];

export const STREETS_EW = ["Grand River Ave", "Michigan Ave", "Lafayette Blvd", "Fort St", "Congress St", "Larned St", "Jefferson Ave"];
export const STREETS_NS = ["Third Ave", "Cass Ave", "Washington Blvd", "Griswold St", "Woodward Ave", "Brush St", "Beaubien St", "St Antoine St", "Rivard St", "Riopelle St"];
export const WOODWARD_INDEX = 4;

export function destinationPosition(d: Destination): [number, number] {
  return blockCenter(d.block[0], d.block[1]);
}

export function indexLabel(index: number) {
  return String(index + 1).padStart(2, "0");
}

export function destinationById(id: string): Destination {
  const d = DESTINATIONS.find((x) => x.id === id);
  if (!d) throw new Error(`unknown destination ${id}`);
  return d;
}

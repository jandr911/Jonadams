export const SITE = {
  name: "Adams UniverseCity",
  surname: "Adams",
  cityName: "UniverseCity",
  artist: "Jonathan Adams",
  nickname: "Jonn",
  city: "Detroit, Michigan",
  year: 2026,
  submitEmail: "",
  bookingEmail: "",
  pressEmail: "",
  joinHref: "/listen#join-list",
  navLocked: true,
};

export const MUSIC = {
  src: "",
  title: "",
};

export const TAGLINE = "Music · Art · The Creatives";

export const COORDINATES = "42.33° N, 83.05° W";

export const CITY_HUD = {
  districtsHint: (count: number) => `${count} districts · Hover to preview · Click to fly in`,
  lockedHint: (count: number) => `${count} districts · Opening soon`,
  readout: "All districts online · Sky lanes active",
  geo: `Downtown Detroit · ${COORDINATES}`,
  mouseHint: "Drag to orbit · Scroll to zoom · Shift‑drag or arrows to move · Q/E up and down",
  touchHint: "One finger to look · Two fingers to move · Pinch to zoom",
  padCue: "Press & hold to move",
  playMusic: "Play music",
  stopMusic: "Stop music",
};

export const LOADER = {
  stages: {
    skyline: "Lighting the skyline",
    neon: "Warming up the neon",
    doors: "Opening the doors",
  },
  welcome: "Welcome to the city",
  welcomeBack: "Welcome back",
  established: `Est. ${SITE.year} · ${SITE.city}`,
  nowEntering: "Now entering",
  presents: `${SITE.artist} presents`,
  caps: "A city built on music · Downtown Detroit",
};

export const JOIN = {
  title: "Join the list",
  body: (email: string) => `Please add ${email} to the ${SITE.name} list.`,
  placeholder: "you@email.com",
  placeholderClosed: "List opens soon",
  submit: "Join",
};

export const CITY_FALLBACK = "This browser can't draw the 3D city. The districts below still take you everywhere.";

export const ALTER_EGO = {
  name: "",
  art: { standing: "/alter-ego/standing.png", smoke: "/alter-ego/smoke.png", walking: "/alter-ego/walking.png" },
  note: "Jonathan Adams' alter ego",
};

export const DESCRIPTION = "Step into the world of Jonathan Adams. Music, art, and the creatives of Detroit.";

export const SHARE_IMAGE = {
  alt: `${SITE.name}, the world of ${SITE.artist} in downtown Detroit`,
  width: 1200,
  height: 630,
};

export const ROOMS = {
  club: {
    description: "Inside Club Adams, the front door to Jonathan Adams' Detroit: music, visuals, merch and the city's creatives.",
    lead: "You made it inside. Four walls, four ways deeper into the city.",
  },
  listen: {
    description: "Listen to Jonathan Adams: singles, the latest release and live sessions, plus official videos and behind the scenes.",
    lead: "Press play right here. Every play on this page counts on the channel.",
    leadEmpty: "The first tracks land here soon. Every play on this page will count on the channel.",
    pending: "Arriving soon",
  },
  watch: {
    lead: "Visuals, behind the scenes, and everything in motion.",
  },
  merch: {
    description: "Adams UniverseCity merch: tees, hoodies, caps and numbered prints from Detroit.",
    lead: "The rack is being stocked. Drop 01 arrives with the next single.",
    status: "Coming soon",
  },
  creatives: {
    description: "The Creatives: a curated wall of Detroit artists, builders and makers, picked by Jonathan Adams.",
    lead: "A curated wall for up-and-coming artists, builders, and makers from the city and beyond. Jonathan picks the lineup.",
    pitch: "Send your work by email. No uploads, no forms — a short note and a link is enough.",
    pitchEmpty: "No uploads, no forms. When submissions open, a short note and a link will be all it takes.",
    soon: "Submissions open soon",
    ask: "Want on the wall?",
    submit: "Email your work",
    subject: "Feature me on The Creatives",
  },
};

export const CLUB_WALLS = [
  { district: "listen", label: "The Sound", note: "Music, straight from the booth" },
  { district: "watch", label: "The Screen", note: "Videos and visuals" },
  { district: "merch", label: "The Rack", note: "Wear the universe" },
  { district: "creatives", label: "The Wall", note: "Creatives on display" },
];

interface SiteLink {
  label: string;
  href: string;
}

export const LINKS: SiteLink[] = [
  { label: "Instagram", href: "" },
  { label: "YouTube", href: "" },
  { label: "Spotify", href: "" },
  { label: "Apple Music", href: "" },
  { label: "TikTok", href: "" },
];

export interface VideoSlot {
  id: string;
  title: string;
  kind: "single" | "release" | "live" | "video";
}

export const VIDEOS: VideoSlot[] = [
  { id: "", title: "Lead single", kind: "single" },
  { id: "", title: "Latest release", kind: "release" },
  { id: "", title: "Live session", kind: "live" },
  { id: "", title: "Fan favorite", kind: "release" },
];

export const VISUALS: VideoSlot[] = [
  { id: "", title: "Official video", kind: "video" },
  { id: "", title: "Behind the scenes", kind: "video" },
];

export const CREATIVE_SLOTS = [
  { craft: "Music", name: "Featured artist" },
  { craft: "Tech", name: "Featured builder" },
  { craft: "Art", name: "Featured designer" },
  { craft: "Film", name: "Featured director" },
  { craft: "Fashion", name: "Featured label" },
  { craft: "Open", name: "Your name here" },
];

export const MERCH = [
  { name: "UniverseCity Tee", note: "Heavyweight cotton" },
  { name: "Skyline Hoodie", note: "Embroidered crest" },
  { name: "District Cap", note: "Six-panel" },
  { name: "Night Poster", note: "Numbered print" },
];

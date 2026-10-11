export const SITE = {
  name: "Adams UniverseCity",
  surname: "Adams",
  cityName: "UniverseCity",
  artist: "Jonathan Adams",
  nickname: "Jonn",
  city: "Detroit, Michigan",
  year: 2026,
  submitEmail: "jonandrafay@gmail.com",
  whatsapp: "12489558542",
  bookingEmail: "",
  pressEmail: "",
  joinHref: "/club#join",
  navLocked: false,
};

export const MUSIC = {
  src: "",
  title: "",
};

export const TAGLINE = "Music · Art · The Creatives";

export const GEO = { lat: 42.33, lon: -83.05 };

export const COORDINATES = `${GEO.lat}° N, ${-GEO.lon}° W`;

export const EQ_BARS = [0.55, 0.9, 0.7, 1, 0.6];

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
  localTime: "Local time",
  preview: "Preview",
  changeTime: (mode: string, phase: string) => `${mode} ${phase}, change time of day`,
  phases: { sunrise: "SUNRISE", day: "DAYTIME", dusk: "DUSK", night: "NIGHT" },
  districtsNav: "City districts",
  padLabel: "Camera controls",
  padHold: (title: string) => `${title}, press and hold`,
  pad: {
    forward: "Move forward (W / ↑)",
    left: "Move left (A / ←)",
    home: "Reset view (R)",
    right: "Move right (D / →)",
    back: "Move back (S / ↓)",
    up: "Move up (E / PageUp)",
    down: "Move down (Q / PageDown)",
    in: "Zoom in (+)",
    out: "Zoom out (−)",
  },
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
  note: "Send your name and we'll add you, first word on every drop.",
  soon: "List opens soon",
  plaque: "First word on every drop",
  close: "Close",
  subject: `Add me to the ${SITE.name} list`,
  message: `Hi Jonathan, add me to the ${SITE.name} list.`,
  whatsapp: { label: "WhatsApp", action: "Message on WhatsApp" },
  email: { label: "Email", action: "Write an email" },
  copy: "Copy",
  copied: "Copied",
  copyBlocked: "Copy blocked, text selected",
};

export const HEADER = {
  nav: "Primary",
  home: `${SITE.name}, home`,
  join: "Join the list",
  joinShort: "Join",
  back: "Back to the city",
  backShort: "Back",
  openMenu: "Open menu",
  closeMenu: "Close menu",
};

export const CONTACT = {
  booking: "Booking",
  press: "Press",
  elsewhere: "Elsewhere",
};

export const districtEyebrow = (index: string) => `District ${index}`;

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
    description: "Inside Club Adams, the front door to Jonathan Adams' Detroit: music, visuals and the city's creatives.",
  },
  listen: {
    description: "Listen to Jonathan Adams: singles, the latest release and live sessions, plus official videos and behind the scenes.",
    pending: "Arriving soon",
    play: (title: string) => `Play ${title}`,
    console: "Tracks on the desk",
  },
  watch: {
    description: "Watch Jonathan Adams: official videos and behind the scenes, screened in Michigan Central Station.",
    console: "Reels in the hall",
  },
  creatives: {
    description: "The Creatives: a curated wall of Detroit artists, builders and makers, picked by Jonathan Adams.",
    console: "Frames on the wall",
    open: "Your name here",
    openCraft: "Open",
    viewProfile: "View profile",
    frames: 6,
    more: (page: number, pages: number) => `More · ${page}/${pages}`,
    moreLabel: (next: number, pages: number) => `Show more creatives, page ${next} of ${pages}`,
  },
};

export const GET_LISTED = {
  ask: "Want on the wall?",
  pitch: "Message Jonathan on WhatsApp or by email. No uploads, no forms — a short note and a link is enough.",
  pitchEmpty: "No uploads, no forms. When submissions open, a short note and a link will be all it takes.",
  soon: "Submissions open soon",
  whatsapp: "WhatsApp Jonathan",
  email: "Email Jonathan",
  subject: "Feature me on The Creatives",
  intro: "Hi Jonathan, I'd like to be on The Creatives wall.",
  fields: ["Name", "Craft", "City", "Short bio", "Photo link", "YouTube", "Instagram / website"],
};

export const PROFILE = {
  watch: "Watch on YouTube",
  links: "Elsewhere",
  portrait: (name: string) => `Portrait of ${name}`,
  back: { label: "The Creatives", note: "Back to the wall", href: "/creatives" },
  description: (name: string, craft: string, city: string) => `${name}, ${craft.toLowerCase()} from ${city}, on The Creatives wall at ${SITE.name}.`,
};

export const CLUB_WALLS = [
  { district: "listen", label: "The Sound", note: "Music, straight from the booth" },
  { district: "watch", label: "The Screen", note: "Videos and visuals" },
  { district: "creatives", label: "The Wall", note: "Creatives on display" },
];

export const CLUB_DESK = [
  { label: "Lead single", note: "Press play in Listen", href: "/listen" },
  { label: "Get on the wall", note: "Pitch The Creatives", href: "/creatives" },
];

export const LISTEN_DESK = [
  { label: "Watch", note: "Videos in Michigan Central", href: "/watch" },
  { label: "The Creatives", note: "Faces on the wall", href: "/creatives" },
];

export const WATCH_DESK = [
  { label: "Listen", note: "Back to the booth", href: "/listen" },
  { label: "The Creatives", note: "Faces on the wall", href: "/creatives" },
];

export const CREATIVES_DESK = [
  { label: "Watch", note: "Videos in Michigan Central", href: "/watch" },
  { label: "Club Adams", note: "Back to the front door", href: "/club" },
];

export const ROOM_NAV = {
  console: "Walls of the club",
  rooms: "Rooms",
  desk: "Front desk",
};

export interface SiteLink {
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

export interface Creative {
  slug: string;
  name: string;
  craft: string;
  city: string;
  bio: string;
  photo: string;
  youtube: string;
  links: SiteLink[];
}

export const CREATIVES: Creative[] = [];

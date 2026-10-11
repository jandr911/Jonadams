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
  src: "/audio/tied.mp3",
  title: "",
};

export const TAGLINE: string = "Music · Art · The Creatives";

export const GEO = { lat: 42.33, lon: -83.05 };

export const COORDINATES = `${GEO.lat}° N, ${-GEO.lon}° W`;

export const EQ_BARS = [0.55, 0.9, 0.7, 1, 0.6];

export const CITY_HUD = {
  districtsHint: "{count} districts · Hover to preview · Click to fly in",
  lockedHint: "{count} districts · Opening soon",
  readout: "All districts online · Sky lanes active",
  geo: "Downtown Detroit · {coordinates}",
  mouseHint: "Drag to orbit · Scroll to zoom · Shift‑drag or arrows to move · Q/E up and down",
  touchHint: "One finger to look · Two fingers to move · Pinch to zoom",
  padCue: "Press & hold to move",
  playMusic: "Play music",
  stopMusic: "Stop music",
  localTime: "Local time",
  preview: "Preview",
  changeTime: "{mode} {phase}, change time of day",
  phases: { sunrise: "SUNRISE", day: "DAYTIME", dusk: "DUSK", night: "NIGHT" },
  districtsNav: "City districts",
  padLabel: "Camera controls",
  padHold: "{title}, press and hold",
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
  enter: "Enter the city",
  established: "Est. {year} · {city}",
  nowEntering: "Now entering",
  presents: "{artist} presents",
  caps: "A city built on music · Downtown Detroit",
};

export const JOIN = {
  title: "Join the list",
  note: "Send your name and we'll add you, first word on every drop.",
  soon: "List opens soon",
  plaque: "First word on every drop",
  close: "Close",
  subject: "Add me to the {name} list",
  message: "Hi Jonathan, add me to the {name} list.",
  whatsapp: { label: "WhatsApp", action: "Message on WhatsApp" },
  email: { label: "Email", action: "Write an email" },
  copy: "Copy",
  copied: "Copied",
  copyBlocked: "Copy blocked, text selected",
};

export const HEADER = {
  nav: "Primary",
  home: "{name}, home",
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

export const DISTRICT_EYEBROW: string = "District {index}";

export const CITY_FALLBACK: string = "This browser can't draw the 3D city. The districts below still take you everywhere.";

export const ALTER_EGO = {
  name: "",
  note: "Jonathan Adams' alter ego",
};

export const ALTER_EGO_ART = { standing: "/alter-ego/standing.png", smoke: "/alter-ego/smoke.png", walking: "/alter-ego/walking.png" };

export const DESCRIPTION: string = "Step into the world of Jonathan Adams. Music, art, and the creatives of Detroit.";

export const SHARE_IMAGE = {
  alt: "{name}, the world of {artist} in downtown Detroit",
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
    play: "Play {title}",
    openYoutube: "Open on YouTube",
    console: "Tracks on the desk",
    more: "More · {page}/{pages}",
    moreLabel: "Show more tracks, page {next} of {pages}",
  },
  watch: {
    description: "Watch Jonathan Adams: official videos and behind the scenes, screened in Michigan Central Station.",
    pending: "Arriving soon",
    console: "Reels in the hall",
    more: "More · {page}/{pages}",
    moreLabel: "Show more reels, page {next} of {pages}",
  },
  creatives: {
    description: "The Creatives: a curated wall of Detroit artists, builders and makers, picked by Jonathan Adams.",
    console: "Frames on the wall",
    open: "Your name here",
    openCraft: "Open",
    viewProfile: "View profile",
    frames: 6,
    more: "More · {page}/{pages}",
    moreLabel: "Show more creatives, page {next} of {pages}",
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
  portrait: "Portrait of {name}",
  back: { label: "The Creatives", note: "Back to the wall", href: "/creatives" },
  description: "{name}, {craft} from {city}, on The Creatives wall at {site}.",
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

export type VideoKind = "single" | "release" | "live" | "video";

export const VIDEO_KINDS: VideoKind[] = ["single", "release", "live", "video"];

export interface VideoSlot {
  uid: string;
  id: string;
  title: string;
  kind: VideoKind;
}

export interface Creative {
  id: string;
  slug: string;
  name: string;
  craft: string;
  city: string;
  bio: string;
  photo: string;
  youtube: string;
  links: SiteLink[];
}

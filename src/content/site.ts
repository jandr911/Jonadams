export const SITE = {
  name: "Adams UniverseCity",
  cityName: "UniverseCity",
  artist: "Jonathan Adams",
  city: "Detroit, Michigan",
  year: 2026,
  submitEmail: "",
  bookingEmail: "",
  pressEmail: "",
  joinHref: "/listen#join-list",
  navLocked: true,
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

import { SITE } from "@/content/site";

export function whatsappDigits() {
  return SITE.whatsapp.replace(/\D/g, "");
}

export function whatsappHref(digits: string, text: string) {
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function mailHref(subject: string, body?: string) {
  const query = `subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ""}`;
  return `mailto:${SITE.submitEmail}?${query}`;
}

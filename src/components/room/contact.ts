export function whatsappDigits(whatsapp: string) {
  return whatsapp.replace(/\D/g, "");
}

export function whatsappHref(digits: string, text: string) {
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function mailHref(email: string, subject: string, body?: string) {
  const query = `subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ""}`;
  return `mailto:${email}?${query}`;
}

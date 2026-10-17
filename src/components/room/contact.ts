export function phoneDigits(phone: string) {
  return phone.replace(/\D/g, "");
}

export function whatsappHref(digits: string, text: string) {
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function telHref(phone: string) {
  return `tel:+${phoneDigits(phone)}`;
}

export function mailHref(email: string, subject: string, body?: string) {
  const query = `subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ""}`;
  return `mailto:${email}?${query}`;
}

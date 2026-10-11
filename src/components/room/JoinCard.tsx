import { CONTACT, JOIN, LINKS, SITE } from "@/content/site";
import { mailHref, whatsappDigits, whatsappHref } from "./contact";
import CopyValue from "./CopyValue";
import JoinDialog from "./JoinDialog";

interface ContactRow {
  label: string;
  value: string;
  display: string;
  action: string;
  href: string;
  external: boolean;
}

function formatPhone(digits: string) {
  const groups: string[] = [];
  let rest = digits;
  for (const size of [4, 3, 3]) {
    if (rest.length <= size) break;
    groups.unshift(rest.slice(-size));
    rest = rest.slice(0, -size);
  }
  return `+${[rest, ...groups].join(" ")}`;
}

function contactRows(): ContactRow[] {
  const rows: ContactRow[] = [];
  const digits = whatsappDigits();
  if (digits) {
    rows.push({
      label: JOIN.whatsapp.label,
      value: `+${digits}`,
      display: formatPhone(digits),
      action: JOIN.whatsapp.action,
      href: whatsappHref(digits, JOIN.message),
      external: true,
    });
  }
  if (SITE.submitEmail) {
    rows.push({
      label: JOIN.email.label,
      value: SITE.submitEmail,
      display: SITE.submitEmail,
      action: JOIN.email.action,
      href: mailHref(JOIN.subject),
      external: false,
    });
  }
  return rows;
}

export default function JoinCard() {
  const rows = contactRows();
  const links = LINKS.filter((l) => l.href);
  const contacts = [
    { label: CONTACT.booking, email: SITE.bookingEmail },
    { label: CONTACT.press, email: SITE.pressEmail },
  ].filter((c) => c.email);
  return (
    <JoinDialog>
      <h2 id="join-title" className="join-card__title">
        {JOIN.title}
      </h2>
      <p className="join-card__note">{JOIN.note}</p>
      {rows.length ? (
        <ul className="join-card__contacts">
          {rows.map((row) => (
            <li key={row.label} className="join-contact">
              <span className="join-contact__label">{row.label}</span>
              <CopyValue value={row.value} display={row.display} />
              <a className="join-contact__action" href={row.href} target={row.external ? "_blank" : undefined} rel={row.external ? "noreferrer" : undefined}>
                {row.action}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <span className="join-card__soon">{JOIN.soon}</span>
      )}
      {links.length + contacts.length > 0 && (
        <nav className="join-card__links" aria-label={CONTACT.elsewhere}>
          {contacts.map((c) => (
            <a key={c.label} href={`mailto:${c.email}`}>
              {c.label}
            </a>
          ))}
          {links.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          ))}
        </nav>
      )}
      <span className="join-card__meta">
        © {SITE.year} {SITE.artist} · {SITE.city}
      </span>
    </JoinDialog>
  );
}

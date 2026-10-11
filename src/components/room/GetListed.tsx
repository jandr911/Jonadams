import { GET_LISTED, SITE } from "@/content/site";
import { mailHref, whatsappDigits, whatsappHref } from "./contact";

interface ContactLink {
  label: string;
  href: string;
  external: boolean;
}

function template() {
  return [GET_LISTED.intro, "", ...GET_LISTED.fields.map((f) => `${f}:`)].join("\n");
}

export function contactLinks(): ContactLink[] {
  const body = template();
  const out: ContactLink[] = [];
  const whatsapp = whatsappDigits();
  if (whatsapp) out.push({ label: GET_LISTED.whatsapp, href: whatsappHref(whatsapp, body), external: true });
  if (SITE.submitEmail) out.push({ label: GET_LISTED.email, href: mailHref(GET_LISTED.subject, body), external: false });
  return out;
}

export default function GetListed({ className, compact = false }: { className: string; compact?: boolean }) {
  const links = contactLinks();
  const Actions = compact ? "div" : "nav";
  return (
    <div className={className}>
      <span className="get-listed__ask">{GET_LISTED.ask}</span>
      {!compact && <p className="get-listed__text">{links.length ? GET_LISTED.pitch : GET_LISTED.pitchEmpty}</p>}
      {links.length ? (
        <Actions className="get-listed__actions" aria-label={compact ? undefined : GET_LISTED.ask}>
          {links.map((l) => (
            <a key={l.href} className="get-listed__link" href={l.href} target={l.external ? "_blank" : undefined} rel={l.external ? "noreferrer" : undefined}>
              {l.label}
            </a>
          ))}
        </Actions>
      ) : (
        <span className="get-listed__soon">{GET_LISTED.soon}</span>
      )}
    </div>
  );
}

"use client";

import { useId, useState } from "react";
import { fill } from "@/content/copy";
import { useCopy } from "@/content/CopyProvider";
import type { MerchItem } from "@/content/site";
import { mailHref, whatsappDigits, whatsappHref } from "./contact";

export default function MerchOrder({ item }: { item: MerchItem }) {
  const { MERCH, SITE } = useCopy();
  const group = useId();
  const sized = item.sizes.length > 0;
  const [picked, setPicked] = useState("");
  const size = sized ? picked : MERCH.oneSize;
  const soldOut = sized && item.sizes.every((s) => s.soldOut);
  const kind = MERCH.kinds[item.kind];
  const message = fill(sized ? MERCH.message : MERCH.messageOneSize, { item: item.name, kind, size, price: item.price });
  const subject = fill(MERCH.subject, { item: item.name });
  const digits = whatsappDigits(SITE.whatsapp);
  const links = [
    digits && { label: MERCH.whatsapp, href: whatsappHref(digits, message), external: true },
    SITE.submitEmail && { label: MERCH.email, href: mailHref(SITE.submitEmail, subject, message), external: false },
  ].filter((l) => !!l);

  return (
    <div className="merch-order">
      {sized ? (
        <fieldset className="merch-order__sizes">
          <legend className="merch-order__legend">{MERCH.sizes}</legend>
          {item.sizes.map((s) => (
            <label key={s.size} className="merch-size" data-sold-out={s.soldOut || undefined}>
              <input
                type="radio"
                name={group}
                value={s.size}
                checked={picked === s.size}
                disabled={s.soldOut}
                aria-label={s.soldOut ? fill(MERCH.sizeSoldOut, { size: s.size }) : undefined}
                onChange={() => setPicked(s.size)}
              />
              <span>{s.size}</span>
            </label>
          ))}
        </fieldset>
      ) : (
        <span className="merch-order__legend">{MERCH.oneSize}</span>
      )}
      {soldOut ? (
        <span className="merch-order__status">{MERCH.soldOut}</span>
      ) : links.length === 0 ? (
        <span className="merch-order__status">{MERCH.orderSoon}</span>
      ) : !size ? (
        <span className="merch-order__status merch-order__status--hint">{MERCH.pickSize}</span>
      ) : (
        <div className="merch-order__actions">
          {links.map((l) => (
            <a key={l.label} className="merch-order__link" href={l.href} target={l.external ? "_blank" : undefined} rel={l.external ? "noreferrer" : undefined}>
              {l.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

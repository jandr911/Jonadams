import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ActionForm from "@/components/admin/ActionForm";
import AdminHead from "@/components/admin/AdminHead";
import Field from "@/components/admin/Field";
import { MerchGlyph } from "@/components/room/MerchCard";
import { MERCH_KINDS } from "@/content/site";
import { getContent } from "@/lib/content";
import { moveMerch, saveMerch } from "../../actions";

export const metadata: Metadata = { title: "Merch" };

export default async function MerchAdmin() {
  const { copy, merch } = await getContent();
  const { MERCH } = copy;
  return (
    <>
      <AdminHead title="Merch" lede="The pieces for sale, in the order visitors see them. Open one to change its photo, price and which sizes are in stock." />
      <div className="admin-stack">
        {merch.length === 0 && <p className="admin-note">Nothing is for sale yet, so the Merch room says “{MERCH.soon}”. Add the first piece below.</p>}
        {merch.map((m, i) => {
          const sizes = m.sizes.length ? m.sizes.map((s) => (s.soldOut ? `${s.size} (sold out)` : s.size)).join(", ") : MERCH.oneSize;
          return (
            <article key={m.id} className="admin-card admin-row">
              <span className="admin-row__portrait admin-row__portrait--merch">
                {m.photo ? <Image src={m.photo} alt="" fill sizes="48px" unoptimized /> : <MerchGlyph kind={m.kind} />}
              </span>
              <div className="admin-row__body">
                <strong>
                  {i + 1}. {m.name}
                </strong>
                <span>{[MERCH.kinds[m.kind], m.price, sizes].join(" · ")}</span>
              </div>
              <Link href={`/admin/merch/${m.id}`} className="admin-btn admin-btn--primary">
                Open
              </Link>
              <div className="admin-card__tools">
                {i > 0 && (
                  <ActionForm action={moveMerch} submit="Move up" compact>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="direction" value="up" />
                  </ActionForm>
                )}
                {i < merch.length - 1 && (
                  <ActionForm action={moveMerch} submit="Move down" compact>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="direction" value="down" />
                  </ActionForm>
                )}
              </div>
            </article>
          );
        })}
        <article className="admin-card admin-card--add">
          <h2 className="admin-card__title">Add a piece</h2>
          <ActionForm action={saveMerch} submit="Add and open" className="admin-form admin-form--wide">
            <Field label="Name" name="name" required placeholder="Detroit Made hoodie" />
            <label className="field">
              <span className="field__label">What it is</span>
              <select className="field__input" name="kind" defaultValue="tee">
                {MERCH_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {MERCH.kinds[k]}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Price" name="price" required placeholder="$45" hint="It starts with sizes S to XL in stock. Set the real sizes on the next screen." />
          </ActionForm>
        </article>
      </div>
    </>
  );
}

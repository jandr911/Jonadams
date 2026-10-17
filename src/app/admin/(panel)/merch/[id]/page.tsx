import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ActionForm from "@/components/admin/ActionForm";
import AdminHead from "@/components/admin/AdminHead";
import Field from "@/components/admin/Field";
import MediaField from "@/components/admin/MediaField";
import { MERCH_KINDS, MERCH_SIZES } from "@/content/site";
import { getContent } from "@/lib/content";
import { removeMerch, saveMerch } from "../../../actions";

export const instant = false;

type Params = Promise<{ id: string }>;

async function merchById(id: string) {
  const { merch } = await getContent();
  return merch.find((m) => m.id === id);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const item = await merchById((await params).id);
  return { title: item?.name ?? "Merch" };
}

export default async function MerchItemAdmin({ params }: { params: Params }) {
  const item = await merchById((await params).id);
  if (!item) notFound();
  const { copy } = await getContent();
  const { MERCH } = copy;
  const stock = (size: string) => {
    const found = item.sizes.find((s) => s.size === size);
    return found ? (found.soldOut ? "out" : "in") : "";
  };
  return (
    <>
      <AdminHead
        title={item.name}
        back={{ href: "/admin/merch", label: "Merch" }}
        lede={
          <>
            Everything visitors see for this piece.{" "}
            <a href="/merch" target="_blank" rel="noreferrer">
              See it on the site
            </a>
            .
          </>
        }
      />
      <div className="admin-stack">
        <article className="admin-card">
          <ActionForm action={saveMerch} submit="Save" className="admin-form admin-form--wide">
            <input type="hidden" name="id" value={item.id} />
            <Field label="Name" name="name" defaultValue={item.name} required />
            <label className="field">
              <span className="field__label">What it is</span>
              <select className="field__input" name="kind" defaultValue={item.kind}>
                {MERCH_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {MERCH.kinds[k]}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Price" name="price" defaultValue={item.price} required placeholder="$45" hint="Written exactly as visitors should see it." />
            <Field className="field--full" label="A line about it" name="note" defaultValue={item.note} multiline hint="Fabric, fit, colour, limited run. Optional." />
            <MediaField label="Photo" name="photo" current={item.photo} accept="image" folder="merch" />
            <fieldset className="admin-fieldset admin-sizes field--full">
              <legend className="field__label">Sizes</legend>
              <p className="field__hint">Visitors pick one of these before ordering. Set every size to “Not offered” for a one-size piece.</p>
              {MERCH_SIZES.map((size) => (
                <label key={size} className="field">
                  <span className="field__label">{size}</span>
                  <select className="field__input" name={`size${size}`} defaultValue={stock(size)}>
                    <option value="">Not offered</option>
                    <option value="in">In stock</option>
                    <option value="out">Sold out</option>
                  </select>
                </label>
              ))}
            </fieldset>
          </ActionForm>
        </article>
        <article className="admin-card admin-card--quiet">
          <p className="admin-note">Removing {item.name} takes it out of the Merch room. It cannot be undone.</p>
          <ActionForm action={removeMerch} submit="Remove from the shop" danger confirm={`Remove ${item.name} from the site?`}>
            <input type="hidden" name="id" value={item.id} />
          </ActionForm>
        </article>
      </div>
    </>
  );
}

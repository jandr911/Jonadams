import type { Metadata } from "next";
import ActionForm from "@/components/admin/ActionForm";
import AdminHead from "@/components/admin/AdminHead";
import Field from "@/components/admin/Field";
import { getContent } from "@/lib/content";
import { moveLink, removeLink, saveLink } from "../../actions";

export const metadata: Metadata = { title: "Social links" };

export default async function LinksAdmin() {
  const { links } = await getContent();
  return (
    <>
      <AdminHead title="Social links" lede="These show in the Join card. A link without an address stays hidden until you add one." />
      <div className="admin-stack">
        {links.map((l, i) => (
          <article key={l.id} className="admin-card">
            <h2 className="admin-card__title">
              {i + 1}. {l.label} {l.href ? "" : "· not showing yet"}
            </h2>
            <ActionForm action={saveLink} submit="Save" className="admin-form admin-form--pair">
              <input type="hidden" name="id" value={l.id} />
              <Field label="Name" name="label" defaultValue={l.label} required />
              <Field label="Link" name="href" defaultValue={l.href} placeholder="https://" />
            </ActionForm>
            <div className="admin-card__tools">
              {i > 0 && (
                <ActionForm action={moveLink} submit="Move up" compact>
                  <input type="hidden" name="id" value={l.id} />
                  <input type="hidden" name="direction" value="up" />
                </ActionForm>
              )}
              {i < links.length - 1 && (
                <ActionForm action={moveLink} submit="Move down" compact>
                  <input type="hidden" name="id" value={l.id} />
                  <input type="hidden" name="direction" value="down" />
                </ActionForm>
              )}
              <ActionForm action={removeLink} submit="Remove" compact danger confirm={`Remove ${l.label}?`}>
                <input type="hidden" name="id" value={l.id} />
              </ActionForm>
            </div>
          </article>
        ))}
        <article className="admin-card admin-card--add">
          <h2 className="admin-card__title">Add a link</h2>
          <ActionForm action={saveLink} submit="Add it" className="admin-form admin-form--pair">
            <Field label="Name" name="label" required placeholder="Bandcamp" />
            <Field label="Link" name="href" placeholder="https://" />
          </ActionForm>
        </article>
      </div>
    </>
  );
}

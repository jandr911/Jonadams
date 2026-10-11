import type { Metadata } from "next";
import Link from "next/link";
import ActionForm from "@/components/admin/ActionForm";
import AdminHead from "@/components/admin/AdminHead";
import Field from "@/components/admin/Field";
import Portrait from "@/components/room/Portrait";
import { getContent } from "@/lib/content";
import { moveCreative, saveCreative } from "../../actions";

export const metadata: Metadata = { title: "The Creatives" };

export default async function CreativesAdmin() {
  const { creatives } = await getContent();
  return (
    <>
      <AdminHead title="The Creatives" lede="The people on the wall, in the order visitors see them. Open someone to change their photo, story and links." />
      <div className="admin-stack">
        {creatives.length === 0 && <p className="admin-note">Nobody is on the wall yet. Add the first person below.</p>}
        {creatives.map((c, i) => (
          <article key={c.id} className="admin-card admin-row">
            <Portrait creative={c} alt="" sizes="56px" className="admin-row__portrait" />
            <div className="admin-row__body">
              <strong>
                {i + 1}. {c.name}
              </strong>
              <span>{[c.craft, c.city].filter(Boolean).join(" · ")}</span>
            </div>
            <Link href={`/admin/creatives/${c.id}`} className="admin-btn admin-btn--primary">
              Open
            </Link>
            <div className="admin-card__tools">
              {i > 0 && (
                <ActionForm action={moveCreative} submit="Move up" compact>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="direction" value="up" />
                </ActionForm>
              )}
              {i < creatives.length - 1 && (
                <ActionForm action={moveCreative} submit="Move down" compact>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="direction" value="down" />
                </ActionForm>
              )}
            </div>
          </article>
        ))}
        <article className="admin-card admin-card--add">
          <h2 className="admin-card__title">Add a person</h2>
          <ActionForm action={saveCreative} submit="Add and open" className="admin-form admin-form--wide">
            <Field label="Name" name="name" required placeholder="Their name or artist name" />
            <Field label="What they do" name="craft" placeholder="Photographer, producer, painter…" />
            <Field label="City" name="city" placeholder="Detroit" />
          </ActionForm>
        </article>
      </div>
    </>
  );
}

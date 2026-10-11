import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ActionForm from "@/components/admin/ActionForm";
import AdminHead from "@/components/admin/AdminHead";
import Field from "@/components/admin/Field";
import MediaField from "@/components/admin/MediaField";
import { getContent } from "@/lib/content";
import { removeCreative, saveCreative } from "../../../actions";

export const instant = false;

type Params = Promise<{ id: string }>;

async function creativeById(id: string) {
  const { creatives } = await getContent();
  return creatives.find((c) => c.id === id);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const creative = await creativeById((await params).id);
  return { title: creative?.name ?? "Creative" };
}

export default async function CreativeAdmin({ params }: { params: Params }) {
  const creative = await creativeById((await params).id);
  if (!creative) notFound();
  const links = [0, 1, 2, 3].map((i) => creative.links[i] ?? { label: "", href: "" });
  return (
    <>
      <AdminHead
        title={creative.name}
        back={{ href: "/admin/creatives", label: "The Creatives" }}
        lede={
          <>
            Everything on their page.{" "}
            <a href={`/creatives/${creative.slug}`} target="_blank" rel="noreferrer">
              See it on the site
            </a>
            .
          </>
        }
      />
      <div className="admin-stack">
        <article className="admin-card">
          <ActionForm action={saveCreative} submit="Save" className="admin-form admin-form--wide">
            <input type="hidden" name="id" value={creative.id} />
            <Field label="Name" name="name" defaultValue={creative.name} required />
            <Field label="What they do" name="craft" defaultValue={creative.craft} placeholder="Photographer, producer, painter…" />
            <Field label="City" name="city" defaultValue={creative.city} placeholder="Detroit" />
            <Field className="field--full" label="A few lines about them" name="bio" defaultValue={creative.bio} multiline hint="Two or three sentences is plenty." />
            <MediaField label="Photo" name="photo" current={creative.photo} accept="image" folder="creatives" />
            <Field label="Their YouTube link" name="youtube" defaultValue={creative.youtube} hint="Adds a “Watch on YouTube” button to their page." placeholder="https://youtube.com/…" />
            <fieldset className="admin-fieldset field--full">
              <legend className="field__label">Other places to find them</legend>
              {links.map((l, i) => (
                <div key={i} className="admin-pair">
                  <Field label="Where" name={`linkLabel${i + 1}`} defaultValue={l.label} placeholder="Instagram" />
                  <Field label="Link" name={`linkHref${i + 1}`} defaultValue={l.href} placeholder="https://" />
                </div>
              ))}
            </fieldset>
          </ActionForm>
        </article>
        <article className="admin-card admin-card--quiet">
          <p className="admin-note">Taking {creative.name} off the wall removes their page from the site. It cannot be undone.</p>
          <ActionForm action={removeCreative} submit="Take off the wall" danger confirm={`Take ${creative.name} off the site?`}>
            <input type="hidden" name="id" value={creative.id} />
          </ActionForm>
        </article>
      </div>
    </>
  );
}

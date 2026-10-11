import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ActionForm from "@/components/admin/ActionForm";
import AdminHead from "@/components/admin/AdminHead";
import Field from "@/components/admin/Field";
import { COPY_SECTIONS, copyFields, type CopySection } from "@/content/copy";
import { getContent } from "@/lib/content";
import { resetWording, saveWording } from "../../../actions";

export const instant = false;

type Params = Promise<{ section: string }>;

function isSection(value: string): value is CopySection {
  return value in COPY_SECTIONS;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { section } = await params;
  return { title: isSection(section) ? COPY_SECTIONS[section] : "Wording" };
}

export default async function WordingSection({ params }: { params: Params }) {
  const { section } = await params;
  if (!isSection(section)) notFound();
  const { copy } = await getContent();
  const fields = copyFields(copy, section);
  const hasPlaceholders = fields.some((f) => /\{\w+\}/.test(f.value));
  return (
    <>
      <AdminHead
        title={COPY_SECTIONS[section]}
        back={{ href: "/admin/wording", label: "Wording" }}
        lede={hasPlaceholders ? <>Anything in curly braces, like {"{count}"}, is filled in by the site. Leave those as they are.</> : "Change the words, then press Save."}
      />
      <div className="admin-stack">
        <article className="admin-card">
          <ActionForm action={saveWording} submit="Save" className="admin-form">
            {fields.map((f) => (
              <Field key={f.key} label={f.label} name={f.key} defaultValue={f.value} multiline={f.value.length > 60} />
            ))}
          </ActionForm>
        </article>
        <article className="admin-card admin-card--quiet">
          <p className="admin-note">Changed your mind? This puts every line here back to how it was originally.</p>
          <ActionForm action={resetWording} submit="Back to original" danger confirm="Put this group back to the original wording?">
            <input type="hidden" name="section" value={section} />
          </ActionForm>
        </article>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import ActionForm from "@/components/admin/ActionForm";
import AdminHead from "@/components/admin/AdminHead";
import Field from "@/components/admin/Field";
import MediaField from "@/components/admin/MediaField";
import { getContent } from "@/lib/content";
import { saveSong } from "../../actions";

export const metadata: Metadata = { title: "Site song" };

export default async function SongAdmin() {
  const { copy } = await getContent();
  return (
    <>
      <AdminHead title="Site song" lede="The track that plays while people explore the city. Clear the link and save to turn the music off." />
      <article className="admin-card">
        <ActionForm action={saveSong} submit="Save" className="admin-form">
          <MediaField label="Track" name="src" current={copy.MUSIC.src} accept="audio" folder="music" />
          <Field label="Title next to the play button" name="title" defaultValue={copy.MUSIC.title} hint="Leave empty to show no title." />
        </ActionForm>
      </article>
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ActionForm from "@/components/admin/ActionForm";
import AdminHead from "@/components/admin/AdminHead";
import Field from "@/components/admin/Field";
import type { VideoSlot } from "@/content/site";
import { getContent } from "@/lib/content";
import { moveVideo, removeVideo, saveVideo } from "../../../actions";

export const instant = false;

type Params = Promise<{ room: string }>;

const ROOMS = {
  listen: { title: "Listen room", lede: "These are the videos on the desk in the Listen room, top to bottom. Give each one a name and paste its YouTube link." },
  watch: { title: "Watch room", lede: "These are the videos screened in the Watch room, in order. Give each one a name and paste its YouTube link." },
};

function isRoom(value: string): value is keyof typeof ROOMS {
  return value in ROOMS;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { room } = await params;
  return { title: isRoom(room) ? ROOMS[room].title : "Videos" };
}

function VideoCard({ video, room, index, count }: { video: VideoSlot; room: string; index: number; count: number }) {
  const youtube = video.id ? `https://youtu.be/${video.id}` : "";
  return (
    <article className="admin-card">
      <h2 className="admin-card__title">
        {index + 1}. {video.title || "Untitled"}
      </h2>
      <ActionForm action={saveVideo} submit="Save" className="admin-form admin-form--wide">
        <input type="hidden" name="id" value={video.uid} />
        <input type="hidden" name="room" value={room} />
        <input type="hidden" name="kind" value={video.kind} />
        <Field label="Name" name="title" defaultValue={video.title} required />
        <Field label="YouTube link" name="youtube" defaultValue={youtube} hint="Visitors can play it on the site or open it on YouTube. Leave this empty and the screen says “Arriving soon”." placeholder="https://youtu.be/…" />
      </ActionForm>
      <div className="admin-card__tools">
        {index > 0 && (
          <ActionForm action={moveVideo} submit="Move up" compact>
            <input type="hidden" name="id" value={video.uid} />
            <input type="hidden" name="room" value={room} />
            <input type="hidden" name="direction" value="up" />
          </ActionForm>
        )}
        {index < count - 1 && (
          <ActionForm action={moveVideo} submit="Move down" compact>
            <input type="hidden" name="id" value={video.uid} />
            <input type="hidden" name="room" value={room} />
            <input type="hidden" name="direction" value="down" />
          </ActionForm>
        )}
        <ActionForm action={removeVideo} submit="Remove" compact danger confirm={`Take “${video.title}” off the site?`}>
          <input type="hidden" name="id" value={video.uid} />
        </ActionForm>
      </div>
    </article>
  );
}

export default async function VideosPage({ params }: { params: Params }) {
  const { room } = await params;
  if (!isRoom(room)) notFound();
  const content = await getContent();
  const videos = content[room];
  return (
    <>
      <AdminHead title={ROOMS[room].title} lede={ROOMS[room].lede} />
      <div className="admin-stack">
        {videos.map((v, i) => (
          <VideoCard key={v.uid} video={v} room={room} index={i} count={videos.length} />
        ))}
        <article className="admin-card admin-card--add">
          <h2 className="admin-card__title">Add a video</h2>
          <ActionForm action={saveVideo} submit="Add it" className="admin-form admin-form--wide">
            <input type="hidden" name="room" value={room} />
            <input type="hidden" name="kind" value={room === "listen" ? "single" : "video"} />
            <Field label="Name" name="title" required placeholder="What should it be called?" />
            <Field label="YouTube link" name="youtube" placeholder="https://youtu.be/…" hint="You can add it now and paste the link later." />
          </ActionForm>
        </article>
      </div>
    </>
  );
}

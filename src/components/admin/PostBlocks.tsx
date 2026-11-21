"use client";

import Image from "next/image";
import { useState } from "react";
import { POST_BLOCK_KINDS, type PostBlock, type PostBlockKind } from "@/content/site";
import { youtubeHref, youtubeIdFrom, youtubeThumb } from "../youtube";
import MediaField from "./MediaField";

const KIND_LABEL: Record<PostBlockKind, string> = {
  text: "Text",
  heading: "Heading",
  photo: "Photo",
  video: "YouTube video",
};

const EMPTY: Record<PostBlockKind, PostBlock> = {
  text: { kind: "text", text: "" },
  heading: { kind: "heading", text: "" },
  photo: { kind: "photo", src: "", caption: "" },
  video: { kind: "video", youtube: "", caption: "" },
};

interface Item {
  key: string;
  block: PostBlock;
}

function VideoField({ name, initial }: { name: string; initial: string }) {
  const [value, setValue] = useState(initial ? youtubeHref(initial) : "");
  const id = youtubeIdFrom(value);
  return (
    <label className="field field--full">
      <span className="field__label">YouTube link</span>
      <input className="field__input" type="text" name={name} value={value} onChange={(e) => setValue(e.target.value)} placeholder="https://youtu.be/…" autoComplete="off" />
      {id ? (
        <span className="media-preview media-preview--video">
          <Image src={youtubeThumb(id)} alt="" fill sizes="240px" unoptimized />
        </span>
      ) : (
        <span className={value.trim() ? "admin-status is-error" : "field__hint"}>
          {value.trim() ? "That does not look like a YouTube link yet. Paste the link from the YouTube share button." : "Paste the link from the YouTube share button. The preview shows here."}
        </span>
      )}
    </label>
  );
}

function BlockFields({ item }: { item: Item }) {
  const { key, block } = item;
  switch (block.kind) {
    case "text":
      return (
        <label className="field field--full">
          <span className="field__label">Text</span>
          <textarea className="field__input" name={`${key}.text`} defaultValue={block.text} rows={Math.min(14, Math.max(4, Math.ceil(block.text.length / 70)))} />
          <span className="field__hint">Leave an empty line between paragraphs.</span>
        </label>
      );
    case "heading":
      return (
        <label className="field field--full">
          <span className="field__label">Heading</span>
          <input className="field__input" name={`${key}.text`} defaultValue={block.text} autoComplete="off" />
        </label>
      );
    case "photo":
      return (
        <>
          <MediaField label="Photo" name={`${key}.src`} current={block.src} accept="image" folder="blog" />
          <label className="field field--full">
            <span className="field__label">Caption</span>
            <input className="field__input" name={`${key}.caption`} defaultValue={block.caption} autoComplete="off" placeholder="Optional" />
          </label>
        </>
      );
    case "video":
      return (
        <>
          <VideoField name={`${key}.youtube`} initial={block.youtube} />
          <label className="field field--full">
            <span className="field__label">Caption</span>
            <input className="field__input" name={`${key}.caption`} defaultValue={block.caption} autoComplete="off" placeholder="Optional" />
          </label>
        </>
      );
  }
}

export default function PostBlocks({ initial }: { initial: PostBlock[] }) {
  const [items, setItems] = useState<Item[]>(() => initial.map((block, i) => ({ key: `b${i}`, block })));
  const [next, setNext] = useState(initial.length);

  const add = (kind: PostBlockKind) => {
    setItems((list) => [...list, { key: `b${next}`, block: EMPTY[kind] }]);
    setNext((n) => n + 1);
  };
  const move = (index: number, by: number) =>
    setItems((list) => {
      const copy = [...list];
      const [item] = copy.splice(index, 1);
      copy.splice(index + by, 0, item);
      return copy;
    });
  const remove = (index: number) => setItems((list) => list.filter((_, i) => i !== index));

  return (
    <div className="admin-blocks field--full">
      <span className="field__label">The post</span>
      <input type="hidden" name="blocks" value={JSON.stringify(items.map(({ key, block }) => ({ key, kind: block.kind })))} />
      {items.length === 0 && <p className="admin-note">Nothing in the post yet. Add text, photos or a YouTube video below, in the order visitors read them.</p>}
      {items.map((item, i) => (
        <fieldset key={item.key} className="admin-fieldset admin-block">
          <legend className="field__label">
            {i + 1}. {KIND_LABEL[item.block.kind]}
          </legend>
          <div className="admin-card__tools">
            {i > 0 && (
              <button type="button" className="admin-btn admin-btn--quiet" onClick={() => move(i, -1)}>
                Move up
              </button>
            )}
            {i < items.length - 1 && (
              <button type="button" className="admin-btn admin-btn--quiet" onClick={() => move(i, 1)}>
                Move down
              </button>
            )}
            <button type="button" className="admin-btn admin-btn--quiet" onClick={() => remove(i)}>
              Remove
            </button>
          </div>
          <BlockFields item={item} />
        </fieldset>
      ))}
      <div className="admin-blocks__add">
        {POST_BLOCK_KINDS.map((kind) => (
          <button key={kind} type="button" className="admin-btn admin-btn--quiet" onClick={() => add(kind)}>
            + {KIND_LABEL[kind]}
          </button>
        ))}
      </div>
      <span className="field__hint">Changes here show on the site when you press Save.</span>
    </div>
  );
}

"use client";

import { useActive } from "./activeScreen";

export interface ReaderArticle {
  id: string;
  body: React.ReactNode;
}

export default function BlogReader({ channel, articles }: { channel: string; articles: ReaderArticle[] }) {
  const activeId = useActive(channel);
  const article = articles.find((a) => a.id === activeId) ?? articles[0];
  if (!article) return null;
  return <div key={article.id}>{article.body}</div>;
}

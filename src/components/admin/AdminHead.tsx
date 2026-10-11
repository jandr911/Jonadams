import Link from "next/link";

interface AdminHeadProps {
  title: string;
  lede?: React.ReactNode;
  back?: { href: string; label: string };
}

export default function AdminHead({ title, lede, back }: AdminHeadProps) {
  return (
    <header className="admin-head">
      {back && (
        <Link href={back.href} className="admin-back">
          ‹ {back.label}
        </Link>
      )}
      <h1 className="admin-title">{title}</h1>
      {lede && <p className="admin-lede">{lede}</p>}
    </header>
  );
}

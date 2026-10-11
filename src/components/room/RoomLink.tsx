import Link from "next/link";

const PLAIN_HREF = /^(#|mailto:|https?:)/;

export default function RoomLink({ href, ...rest }: React.ComponentProps<"a"> & { href: string }) {
  return PLAIN_HREF.test(href) ? <a href={href} {...rest} /> : <Link href={href} {...rest} />;
}

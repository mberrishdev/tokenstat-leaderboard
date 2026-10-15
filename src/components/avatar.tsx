import Image from "next/image";

export function Avatar({ src, login, size }: { src: string | null; login: string; size: number }) {
  if (!src) {
    return (
      <span
        className="num inline-flex shrink-0 items-center justify-center rounded-full bg-line text-xs uppercase text-muted"
        style={{ width: size, height: size }}
      >
        {login[0]}
      </span>
    );
  }
  return (
    <Image
      src={`${src}${src.includes("?") ? "&" : "?"}s=${size * 2}`}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full bg-line"
    />
  );
}

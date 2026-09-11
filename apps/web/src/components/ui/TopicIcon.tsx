import Image from "next/image";
import { FileQuestion } from "lucide-react";

export function TopicIcon({
  iconUrl,
  size,
}: {
  iconUrl: string | null;
  size: number;
}) {
  if (iconUrl) {
    return (
      <Image
        src={iconUrl}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-lg object-contain"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className="grid shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.08] text-accent-light"
      style={{ width: size, height: size }}
    >
      <FileQuestion size={Math.max(13, Math.round(size * 0.56))} />
    </span>
  );
}

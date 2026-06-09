"use client";

import dynamic from "next/dynamic";
import "@uiw/react-md-editor/markdown-editor.css";

// MDEditor cần `window` → tắt SSR
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

interface Props {
  value: string;
  onChange: (value: string) => void;
  height?: number;
}

export default function MarkdownEditor({ value, onChange, height = 420 }: Props) {
  return (
    <div data-color-mode="dark">
      <MDEditor
        value={value}
        onChange={(v) => onChange(v ?? "")}
        height={height}
        preview="live"
        visibleDragbar={false}
      />
    </div>
  );
}

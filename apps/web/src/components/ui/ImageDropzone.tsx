"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { ImagePlus, X } from "lucide-react";

const ACCEPTED = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/svg+xml": [".svg"],
};
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

interface ImageDropzoneProps {
  value: File | null;
  preview: string | null;
  onChange: (file: File | null, preview: string | null) => void;
  label?: string;
}

export default function ImageDropzone({
  value,
  preview,
  onChange,
  label = "Icon",
}: ImageDropzoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      onChange(file, url);
    },
    [onChange],
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept: ACCEPTED,
      maxSize: MAX_SIZE,
      maxFiles: 1,
      multiple: false,
    });

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    if (value && preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    onChange(null, null);
  }

  const rejection = fileRejections[0];
  let errorMsg: string | null = null;
  if (rejection) {
    const code = rejection.errors[0]?.code;
    if (code === "file-too-large") errorMsg = "Ảnh quá lớn, tối đa 2 MB.";
    else if (code === "file-invalid-type")
      errorMsg = "Chỉ chấp nhận JPEG, PNG, WebP, SVG.";
    else errorMsg = "File không hợp lệ.";
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[#9898aa]">{label}</label>

      <div
        {...getRootProps()}
        className="relative flex items-center justify-center rounded-xl border-2 border-dashed transition-colors duration-150 cursor-pointer overflow-hidden"
        style={{
          height: 120,
          borderColor: isDragActive
            ? "#7c3aed"
            : errorMsg
              ? "#ef4444"
              : "#1c1c28",
          background: isDragActive
            ? "rgba(124,58,237,0.06)"
            : "#0d0d14",
        }}
      >
        <input {...getInputProps()} />

        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="preview"
              className="h-full w-full object-contain p-2"
            />
            <button
              type="button"
              onClick={clear}
              className="absolute top-1.5 right-1.5 p-1 rounded-full text-[#606072] hover:text-[#ef4444] transition-colors"
              style={{ background: "rgba(13,13,20,0.85)" }}
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-[#606072]">
            <ImagePlus size={22} />
            <span className="text-xs text-center px-3">
              {isDragActive
                ? "Thả ảnh vào đây"
                : "Kéo thả hoặc click để chọn ảnh"}
            </span>
            <span className="text-[10px] text-[#3d3d54]">
              JPEG · PNG · WebP · SVG · tối đa 2 MB
            </span>
          </div>
        )}
      </div>

      {errorMsg && (
        <p className="text-xs text-[#ef4444]">{errorMsg}</p>
      )}
    </div>
  );
}

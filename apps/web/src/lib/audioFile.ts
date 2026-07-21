const AUDIO_EXTENSION_BY_MIME: Record<string, string> = {
  "audio/flac": "flac",
  "audio/m4a": "m4a",
  "audio/mp3": "mp3",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/mpga": "mpga",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/wave": "wav",
  "audio/webm": "webm",
  "audio/x-m4a": "m4a",
  "audio/x-wav": "wav",
};

export function audioFileNameFromBlob(blob: Blob, baseName = "recording") {
  const mimeType = blob.type.split(";")[0]?.trim().toLowerCase();
  const extension = (mimeType && AUDIO_EXTENSION_BY_MIME[mimeType]) || "webm";
  return `${baseName}.${extension}`;
}

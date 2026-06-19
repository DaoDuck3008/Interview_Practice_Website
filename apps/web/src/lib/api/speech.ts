import api, { type ApiResponse } from "./api";

export async function transcribeAudio(
  formData: FormData,
): Promise<{ transcript: string }> {
  const res = await api.post<ApiResponse<{ transcript: string }>>(
    "/speech/transcribe",
    formData,
    { headers: { "Content-Type": undefined } }, // let browser set multipart boundary
  );
  return res.data.data;
}

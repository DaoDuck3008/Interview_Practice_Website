import api, { type ApiResponse } from "./api";

export interface Score {
  id: string;
  technicalScore: number;
  completenessScore: number;
  clarityScore: number;
  hasExample: boolean;
  feedback: string;
}

export interface Session {
  id: string;
  questionId: string;
  transcript: string;
  duration: number;
  createdAt: string;
  score?: Score;
}

export async function getSessionsByQuestion(questionId: string): Promise<Session[]> {
  try {
    const res = await api.get<ApiResponse<Session[]>>(`/sessions?questionId=${questionId}`);
    return res.data.data;
  } catch {
    return [];
  }
}

export async function createSession(formData: FormData): Promise<Session> {
  const res = await api.post<ApiResponse<Session>>("/sessions", formData, {
    headers: { "Content-Type": undefined }, // let browser set multipart/form-data with boundary
  });
  return res.data.data;
}

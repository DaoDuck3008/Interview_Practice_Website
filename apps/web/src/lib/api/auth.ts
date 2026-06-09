import api, { type ApiResponse } from "./api";
import type { AuthUser } from "@/stores/auth.store";

export type { AuthUser };

interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export async function loginApi(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await api.post<ApiResponse<LoginResponse>>("/auth/login", {
    email,
    password,
  });
  return res.data.data;
}

export async function registerApi(
  name: string,
  email: string,
  password: string,
): Promise<AuthUser> {
  const res = await api.post<ApiResponse<AuthUser>>("/auth/register", {
    name,
    email,
    password,
  });
  return res.data.data;
}

export async function logoutApi(): Promise<void> {
  await api.post("/auth/logout");
}

export async function refreshApi(): Promise<LoginResponse> {
  const res = await api.post<ApiResponse<LoginResponse>>("/auth/refresh");
  return res.data.data;
}

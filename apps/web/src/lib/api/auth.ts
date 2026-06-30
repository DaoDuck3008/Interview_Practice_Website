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
): Promise<{ email: string }> {
  const res = await api.post<ApiResponse<{ email: string }>>("/auth/register", {
    name,
    email,
    password,
  });
  return res.data.data;
}

/** Xác thực email bằng mã 6 số → trả token + user (đăng nhập luôn). */
export async function verifyEmailApi(
  email: string,
  code: string,
): Promise<LoginResponse> {
  const res = await api.post<ApiResponse<LoginResponse>>("/auth/verify-email", {
    email,
    code,
  });
  return res.data.data;
}

export async function resendVerificationApi(
  email: string,
): Promise<{ message: string }> {
  const res = await api.post<ApiResponse<{ message: string }>>(
    "/auth/resend-verification",
    { email },
  );
  return res.data.data;
}

export async function forgotPasswordApi(
  email: string,
): Promise<{ message: string }> {
  const res = await api.post<ApiResponse<{ message: string }>>(
    "/auth/forgot-password",
    { email },
  );
  return res.data.data;
}

export async function resetPasswordApi(
  email: string,
  code: string,
  password: string,
): Promise<{ message: string }> {
  const res = await api.post<ApiResponse<{ message: string }>>(
    "/auth/reset-password",
    { email, code, password },
  );
  return res.data.data;
}

export async function googleLoginApi(
  idToken: string,
): Promise<LoginResponse> {
  const res = await api.post<ApiResponse<LoginResponse>>("/auth/google", {
    idToken,
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

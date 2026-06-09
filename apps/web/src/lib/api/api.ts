import axios from "axios";
import { useAuthStore } from "@/stores/auth.store";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1",
  withCredentials: true,
  paramsSerializer: (params) => {
    const searchParams = new URLSearchParams();
    for (const key in params) {
      const value = params[key];
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(key, String(v)));
      } else if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    return searchParams.toString();
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let queue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    const isAuthRoute =
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/register") ||
      originalRequest.url?.includes("/auth/refresh");

    const authHeader =
      originalRequest.headers?.Authorization ||
      originalRequest.headers?.authorization;

    const token = useAuthStore.getState().access_token;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthRoute &&
      (token || authHeader)
    ) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;

        try {
          const res = await api.post<ApiResponse<{ accessToken: string }>>("/auth/refresh");
          const newToken = res.data.data.accessToken;

          const { user } = useAuthStore.getState();
          if (user) {
            useAuthStore.getState().setAuth(newToken, user);
          } else {
            useAuthStore.setState({ access_token: newToken });
          }

          isRefreshing = false;
          queue.forEach((cb) => cb(newToken));
          queue = [];

          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (err) {
          if (useAuthStore.getState().access_token) {
            useAuthStore.getState().clearAuth();
            if (typeof window !== "undefined") {
              const redirect = window.location.pathname + window.location.search;
              window.location.href = `/login?redirect=${encodeURIComponent(redirect)}`;
            }
          }
          isRefreshing = false;
          queue = [];
          return Promise.reject(err);
        }
      }

      return new Promise((resolve) => {
        queue.push((token: string) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(api(originalRequest));
        });
      });
    }

    return Promise.reject(error);
  }
);

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export default api;

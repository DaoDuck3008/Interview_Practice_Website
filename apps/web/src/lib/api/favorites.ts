import api, { type ApiResponse } from "./api";
import type { Paginated, Question } from "./questions";

export interface FavoriteQuestion extends Question {
  favoritedAt: string;
}

export async function getFavoriteIds(): Promise<string[]> {
  try {
    const res = await api.get<ApiResponse<string[]>>("/favorites/ids");
    return res.data.data;
  } catch {
    return [];
  }
}

export async function getRecentFavorites(
  limit = 8,
): Promise<FavoriteQuestion[]> {
  try {
    const res = await api.get<ApiResponse<FavoriteQuestion[]>>(
      "/favorites/recent",
      { params: { limit } },
    );
    return res.data.data;
  } catch {
    return [];
  }
}

export async function getFavoritesPaginated(
  query: { page?: number; limit?: number } = {},
): Promise<Paginated<FavoriteQuestion>> {
  try {
    const res = await api.get<ApiResponse<Paginated<FavoriteQuestion>>>(
      "/favorites",
      { params: query },
    );
    return res.data.data;
  } catch {
    return {
      items: [],
      total: 0,
      page: 1,
      limit: query.limit ?? 10,
      totalPages: 0,
    };
  }
}

export async function addFavorite(questionId: string): Promise<void> {
  await api.post(`/favorites/${questionId}`);
}

export async function removeFavorite(questionId: string): Promise<void> {
  await api.delete(`/favorites/${questionId}`);
}

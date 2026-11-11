// category の API の呼び出し（詳細設計 category/S-13_種別管理.md 7章）
import { apiDelete, apiGet, apiPost, apiPut } from '../../common/api/client';
import type { CategoryCreateRequest, CategoryResponse, CategoryUpdateRequest } from './types';

/** K-01 種別の一覧（並び順はサーバーが決める） */
export function getCategories(): Promise<CategoryResponse[]> {
  return apiGet<CategoryResponse[]>('/api/categories');
}

/** K-02 種別を追加する。作った種別が返る */
export function createCategory(request: CategoryCreateRequest): Promise<CategoryResponse> {
  return apiPost<CategoryResponse>('/api/categories', request);
}

/** K-03 種別を変える。変えたあとの種別が返る */
export function updateCategory(id: number, request: CategoryUpdateRequest): Promise<CategoryResponse> {
  return apiPut<CategoryResponse>(`/api/categories/${id}`, request);
}

/** K-04 種別を消す */
export function deleteCategory(id: number): Promise<null> {
  return apiDelete<null>(`/api/categories/${id}`);
}

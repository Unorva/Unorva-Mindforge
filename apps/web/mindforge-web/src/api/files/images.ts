import type { ApiResult } from '@/types/api';
import { getAccessToken } from '@/utils/auth';

type UploadedImage = { url: string; name: string; contentType: string; size: number };

function apiUrl(path: string) {
  return `${(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')}${path}`;
}

function authorization() {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export async function uploadMarkdownImage(file: File, signal: AbortSignal): Promise<UploadedImage> {
  const body = new FormData();
  body.append('file', file);
  const response = await fetch(apiUrl('/api/files/images'), {
    method: 'POST',
    headers: authorization(),
    body,
    signal: AbortSignal.any([signal, AbortSignal.timeout(120000)]),
  });
  const result: ApiResult<UploadedImage> | undefined = await response.json().catch(() => undefined);
  if (!response.ok || !result?.success || !result.data?.url) {
    throw new Error(result?.message || '图片上传失败，请重新粘贴。');
  }
  return result.data;
}

/** 仅向本服务的图片接口发送登录凭据，外部图片沿用浏览器直接加载。 */
export function isStoredMarkdownImage(src: string) {
  return /^\/api\/files\/images\/\d+\/[a-f0-9]{32}\.(png|jpg|gif|webp)$/.test(src);
}

export async function loadMarkdownImage(src: string, signal: AbortSignal) {
  const response = await fetch(apiUrl(src), {
    headers: authorization(),
    signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]),
  });
  if (!response.ok) throw new Error('图片加载失败，请确认登录状态后重试。');
  return response.blob();
}

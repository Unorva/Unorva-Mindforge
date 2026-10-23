import { clearAccessToken, getAccessToken } from '@/utils/auth';
import { toast } from '@/components/ui/toast';

type ApiErrorPayload = Record<string, unknown>;
export type RequestOptions = { silent?: boolean };

class ReportedRequestError extends Error {}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return typeof value === 'object' && value !== null;
}

function getResponseErrorMessage(value: unknown, fallback: string) {
  if (isApiErrorPayload(value) && typeof value.message === 'string' && value.message.trim()) {
    return value.message;
  }
  return fallback;
}

function showRequestError(message: string) {
  toast.add({ type: 'error', title: '请求失败', description: message });
}

/**
 * 前台请求的网络、状态码和业务失败统一提示一次；后台轮询可用 silent 保持安静。
 * 业务失败也会抛出异常，只有成功响应会交给调用方更新页面。
 */
async function request(
  url: string,
  init: RequestInit,
  fallbackMessage: string,
  options: RequestOptions = {},
) {
  const reportError = (message: string) => {
    if (!options.silent) showRequestError(message);
  };
  try {
    const apiBase = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
    const response = await fetch(`${apiBase}${url}`, {
      ...init,
      signal:
        init.signal ??
        AbortSignal.timeout(
          url.startsWith('/ai/') ? 65000 : url.startsWith('/mail') ? 120000 : 30000,
        ),
    });
    const payload = await response.json().catch(() => undefined);

    if (response.status === 401) {
      clearAccessToken();
      if (!window.location.pathname.startsWith('/auth/')) {
        window.location.assign('/auth/auth2/login');
      }
    }

    if (!response.ok) {
      const message = getResponseErrorMessage(payload, fallbackMessage);
      reportError(message);
      throw new ReportedRequestError(message);
    }

    if (payload === undefined) {
      const message = '服务器响应格式错误，请稍后重试。';
      reportError(message);
      throw new ReportedRequestError(message);
    }

    if (isApiErrorPayload(payload) && payload.success === false) {
      const message = getResponseErrorMessage(payload, fallbackMessage);
      reportError(message);
      throw new ReportedRequestError(message);
    }

    return payload;
  } catch (error) {
    if (error instanceof ReportedRequestError) throw error;

    const message =
      error instanceof DOMException && error.name === 'TimeoutError'
        ? '请求超时，请稍后重试。'
        : error instanceof TypeError
          ? '网络请求失败，请检查网络后重试。'
          : error instanceof Error && error.message
            ? error.message
            : '网络请求失败，请检查网络后重试。';
    reportError(message);
    throw error;
  }
}

/**
 * 为已登录用户的请求附带当前 Bearer Token。
 * 登录、注册等匿名请求在没有 Token 时仍会正常发出。
 */
const getAuthorizationHeader = (): HeadersInit => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * GET 请求
 */
const getFetcher = async (
  url: string,
  params?: Record<string, string | number | boolean | undefined>,
  options?: RequestOptions,
) => {
  if (params) {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();

    if (queryString) {
      url += `${url.includes('?') ? '&' : '?'}${queryString}`;
    }
  }

  return request(
    url,
    {
      headers: getAuthorizationHeader(),
    },
    '获取数据失败，请稍后重试。',
    options,
  );
};

/**
 * POST 请求
 */
const postFetcher = (url: string, arg?: unknown, options?: RequestOptions) =>
  request(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthorizationHeader(),
      },
      body: arg !== undefined ? JSON.stringify(arg) : undefined,
    },
    '提交数据失败，请稍后重试。',
    options,
  );

/**
 * PUT 请求
 */
const putFetcher = (url: string, arg?: unknown) =>
  request(
    url,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthorizationHeader(),
      },
      body: arg !== undefined ? JSON.stringify(arg) : undefined,
    },
    '更新数据失败，请稍后重试。',
  );

/**
 * PATCH 请求
 */
const patchFetcher = (url: string, arg?: unknown) =>
  request(
    url,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthorizationHeader(),
      },
      body: arg !== undefined ? JSON.stringify(arg) : undefined,
    },
    '更新数据失败，请稍后重试。',
  );

/**
 * DELETE 请求
 */
const deleteFetcher = (url: string, arg?: unknown) =>
  request(
    url,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthorizationHeader(),
      },
      body: arg !== undefined ? JSON.stringify(arg) : undefined,
    },
    '删除数据失败，请稍后重试。',
  );

export { getFetcher, postFetcher, putFetcher, patchFetcher, deleteFetcher };

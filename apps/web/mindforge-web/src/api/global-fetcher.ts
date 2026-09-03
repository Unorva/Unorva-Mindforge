import { getAccessToken } from '@/utils/auth';
import { toast } from '@/components/ui/toast';

type ApiErrorPayload = Record<string, unknown>;

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
  toast.add({
    description: message,
    priority: 'high',
    title: '请求失败',
    type: 'error',
  });
}

/**
 * 所有 HTTP 请求共用同一条失败反馈：网络、状态码和业务响应失败都会提示一次。
 * 业务响应仍原样返回，调用方可以继续根据 success 决定后续交互。
 */
async function request(url: string, init: RequestInit, fallbackMessage: string) {
  try {
    const response = await fetch(url, init);
    const payload = await response.json().catch(() => undefined);

    if (!response.ok) {
      const message = getResponseErrorMessage(payload, fallbackMessage);
      showRequestError(message);
      throw new ReportedRequestError(message);
    }

    if (payload === undefined) {
      const message = '服务器响应格式错误，请稍后重试。';
      showRequestError(message);
      throw new ReportedRequestError(message);
    }

    if (isApiErrorPayload(payload) && payload.success === false) {
      showRequestError(getResponseErrorMessage(payload, fallbackMessage));
    }

    return payload;
  } catch (error) {
    if (error instanceof ReportedRequestError) throw error;

    const message = error instanceof TypeError
      ? '网络请求失败，请检查网络后重试。'
      : error instanceof Error && error.message
        ? error.message
        : '网络请求失败，请检查网络后重试。';
    showRequestError(message);
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
      url += `?${queryString}`;
    }
  }

  return request(url, {
    headers: getAuthorizationHeader(),
  }, '获取数据失败，请稍后重试。');
};

/**
 * POST 请求
 */
const postFetcher = (url: string, arg?: unknown) =>
  request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthorizationHeader(),
    },
    body: arg !== undefined ? JSON.stringify(arg) : undefined,
  }, '提交数据失败，请稍后重试。');

/**
 * PUT 请求
 */
const putFetcher = (url: string, arg?: unknown) =>
  request(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthorizationHeader(),
    },
    body: arg !== undefined ? JSON.stringify(arg) : undefined,
  }, '更新数据失败，请稍后重试。');

/**
 * PATCH 请求
 */
const patchFetcher = (url: string, arg?: unknown) =>
  request(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthorizationHeader(),
    },
    body: arg !== undefined ? JSON.stringify(arg) : undefined,
  }, '更新数据失败，请稍后重试。');

/**
 * DELETE 请求
 */
const deleteFetcher = (url: string, arg?: unknown) =>
  request(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthorizationHeader(),
    },
    body: arg !== undefined ? JSON.stringify(arg) : undefined,
  }, '删除数据失败，请稍后重试。');

export {
  getFetcher,
  postFetcher,
  putFetcher,
  patchFetcher,
  deleteFetcher,
};

import { getAccessToken } from '@/utils/auth';

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

  const res = await fetch(url, {
    headers: getAuthorizationHeader(),
  });
  if (!res.ok) {
    throw new Error('Failed to fetch the data');
  }
  return await res.json();
};

/**
 * POST 请求
 */
const postFetcher = (url: string, arg?: unknown) =>
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthorizationHeader(),
    },
    body: arg !== undefined ? JSON.stringify(arg) : undefined,
  }).then((res) => {
    if (!res.ok) {
      throw new Error('Failed to post data');
    }

    return res.json();
  });

/**
 * PUT 请求
 */
const putFetcher = (url: string, arg?: unknown) =>
  fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthorizationHeader(),
    },
    body: arg !== undefined ? JSON.stringify(arg) : undefined,
  }).then((res) => {
    if (!res.ok) {
      // 后端校验或业务异常会放在统一响应的 message 中，保留它便于页面直接提示用户。
      return res.json()
        .then((result: { message?: string }) => {
          throw new Error(result.message || '更新数据失败');
        })
        .catch((error: unknown) => {
          if (error instanceof Error && error.message !== 'Unexpected end of JSON input') {
            throw error;
          }
          throw new Error('更新数据失败');
        });
    }

    return res.json();
  });

/**
 * PATCH 请求
 */
const patchFetcher = (url: string, arg?: unknown) =>
  fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthorizationHeader(),
    },
    body: arg !== undefined ? JSON.stringify(arg) : undefined,
  }).then((res) => {
    if (!res.ok) {
      throw new Error('Failed to update data');
    }

    return res.json();
  });

/**
 * DELETE 请求
 */
const deleteFetcher = (url: string, arg?: unknown) =>
  fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthorizationHeader(),
    },
    body: arg !== undefined ? JSON.stringify(arg) : undefined,
  }).then((res) => {
    if (!res.ok) {
      throw new Error('Failed to delete data');
    }

    return res.json();
  });

export {
  getFetcher,
  postFetcher,
  putFetcher,
  patchFetcher,
  deleteFetcher,
};

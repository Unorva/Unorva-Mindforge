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

  const res = await fetch(url);
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
    },
    body: arg !== undefined ? JSON.stringify(arg) : undefined,
  }).then((res) => {
    if (!res.ok) {
      throw new Error('Failed to update data');
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

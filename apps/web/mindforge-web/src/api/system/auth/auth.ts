// 登录接口：组件不再关心 URL、POST 和 JSON 序列化细节
import { LoginData, LoginParams, RegisterParams } from '@/types/apps/auth.ts';
import { ApiResult } from '@/types/api.ts';
import { postFetcher } from '@/api/global-fetcher.ts';

/**
 * 登录接口
 * @param params 登录参数
 */
export function login(params: LoginParams) {
  return postFetcher(
    '/auth/login',
    params,
  ) as Promise<ApiResult<LoginData>>;
}

/**
 * 注册接口
 * @param params 注册参数
 */
export function register(params: RegisterParams) {
  return postFetcher(
    '/auth/register',
    params,
  ) as Promise<ApiResult<void>>;
}

/**
 * 登出接口
 */
export function logout() {
  return postFetcher(
    '/auth/logout',
    undefined
  ) as Promise<ApiResult<void>>;
}

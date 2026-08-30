/**
 * 登录返回
 */
export interface LoginData {
  token: string;
}

/**
 * 登录参数
 */
export interface LoginParams {
  email: string;
  password: string;
  remember: boolean;
}

/**
 * 注册参数
 */
export interface RegisterParams {
  nickname: string;
  email: string;
  password: string;
}

/**
 * 后端统一响应结构，对应 Java 的 Result<T>
 */
export interface ApiResult<T> {
  code: number;
  success: boolean;
  message: string;
  data: T;
}

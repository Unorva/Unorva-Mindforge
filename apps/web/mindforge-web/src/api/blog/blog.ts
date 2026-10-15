import { deleteFetcher, getFetcher, postFetcher, putFetcher } from '@/api/global-fetcher';
import type { ApiResult } from '@/types/api';
import type { BlogPostType } from '@/types/apps/blog';

export const getBlogs = (): Promise<ApiResult<BlogPostType[]>> =>
  getFetcher('/api/data/blog/BlogPosts');
export const saveBlog = (post: Partial<BlogPostType>): Promise<ApiResult<BlogPostType[]>> =>
  post.id ? putFetcher('/api/blog/update', post) : postFetcher('/api/blog/add', post);
export const deleteBlog = (id: string | number): Promise<ApiResult<BlogPostType[]>> =>
  deleteFetcher('/api/blog/delete', { id });
export const addBlogComment = (
  postId: string | number,
  comment: string,
  parentId?: string,
): Promise<ApiResult<BlogPostType[]>> =>
  postFetcher('/api/blog/comments/add', { postId, comment, parentId });

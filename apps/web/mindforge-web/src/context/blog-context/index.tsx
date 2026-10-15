import { createContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import useSWR from 'swr';
import { addBlogComment, getBlogs } from '@/api/blog/blog';
import type { BlogPostType, BlogType } from '@/types/apps/blog';

export interface BlogContextProps {
  posts: BlogPostType[];
  sortBy: string;
  selectedPost: BlogPostType | null;
  isLoading: boolean;
  setPosts: Dispatch<SetStateAction<BlogPostType[]>>;
  setSortBy: Dispatch<SetStateAction<string>>;
  setSelectedPost: Dispatch<SetStateAction<BlogPostType | null>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  addComment: (postId: string | number, comment: BlogType) => Promise<void>;
  refresh: () => Promise<void>;
  error: unknown;
}

export const BlogContext = createContext<BlogContextProps>({
  posts: [],
  sortBy: 'newest',
  selectedPost: null,
  isLoading: true,
  setPosts: () => {},
  setSortBy: () => {},
  setSelectedPost: () => {},
  setLoading: () => {},
  addComment: async () => {},
  refresh: async () => {},
  error: null,
});

export function BlogProvider({ children }: { children: ReactNode }) {
  const { data, error, isLoading, mutate } = useSWR('blogs', getBlogs);
  const [sortBy, setSortBy] = useState('newest');
  const [selectedPost, setSelectedPost] = useState<BlogPostType | null>(null);
  const setPosts: Dispatch<SetStateAction<BlogPostType[]>> = (updates) => {
    if (data)
      void mutate(
        { ...data, data: typeof updates === 'function' ? updates(data.data) : updates },
        false,
      );
  };
  return (
    <BlogContext.Provider
      value={{
        posts: data?.data ?? [],
        sortBy,
        selectedPost,
        isLoading,
        setPosts,
        setSortBy,
        setSelectedPost,
        setLoading: () => {},
        error,
        refresh: async () => {
          await mutate();
        },
        addComment: async (postId, comment) => {
          const result = await addBlogComment(postId, comment.comment ?? '');
          await mutate(result, false);
        },
      }}
    >
      {children}
    </BlogContext.Provider>
  );
}

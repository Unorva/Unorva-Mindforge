import { useContext } from 'react';
import { orderBy } from 'lodash';

import { BlogContext } from '../../../context/blog-context';
import BlogFeaturedCard from './blog-featuredcard';

import BlogCard from './blog-card';
import { BlogPostType } from 'src/types/apps/blog';
import StyleAwareWrapper from 'src/components/shared/StyleAwareWrapper';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

const BlogListing = () => {
  const { posts, sortBy, isLoading, error, refresh } = useContext(BlogContext);
  if (isLoading) return <p className="py-12 text-center text-muted-foreground">正在加载文章…</p>;
  if (error)
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-destructive">文章加载失败</p>
        <Button variant="outline" onClick={() => void refresh()}>
          重试
        </Button>
      </div>
    );
  if (!posts.length)
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-muted-foreground">还没有博客文章</p>
        <Button render={<Link to="/apps/blog/create" />}>创建第一篇博客</Button>
      </div>
    );

  // Function to filter blog posts based on sorting criteria
  const filterBlogs = (posts: BlogPostType[], sortBy: string) => {
    let filteredPosts = [...posts];

    if (sortBy === 'newest') {
      filteredPosts = orderBy(filteredPosts, ['createdAt'], ['desc']);
    } else if (sortBy === 'oldest') {
      filteredPosts = orderBy(filteredPosts, ['createdAt'], ['asc']);
    } else if (sortBy === 'popular') {
      filteredPosts = orderBy(filteredPosts, ['view'], ['desc']);
    }

    // Filter out featured posts
    return filteredPosts.filter((post) => !post.featured);
  };

  // Function to filter featured posts
  const filterFeaturedPosts = (posts: BlogPostType[]) => {
    return posts.filter((post) => post.featured);
  };

  const blogPosts = filterBlogs(posts, sortBy);
  const featuredPosts = filterFeaturedPosts(posts);

  return (
    <StyleAwareWrapper
      lyraClassName="grid grid-cols-12 gap-px"
      defaultClassName="grid grid-cols-12 gap-6"
    >
      {featuredPosts.map((post, index) => {
        return <BlogFeaturedCard index={index} post={post} key={post.id} />;
      })}
      {blogPosts.map((post) => {
        return <BlogCard post={post} key={post.id} />;
      })}
    </StyleAwareWrapper>
  );
};
export default BlogListing;

import BlogPost from "src/components/apps/blog/blog-post";
import { AppPage, AppPageHeader } from "@/components/shared/app-workspace";

const Blog = () => {
  return (
    <AppPage className="gap-5 bg-transparent p-0">
      <AppPageHeader title="Blog app" />
      <section className="[&>div]:gap-5"><BlogPost /></section>
    </AppPage>
  );
};
export default Blog;

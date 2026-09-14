import BlogDetailData from "@/components/apps/blog/detail";
import { BlogProvider } from "src/context/blog-context";
import { AppPage, AppPageHeader } from "@/components/shared/app-workspace";

const BlogDetail = () => {
  return (
    <BlogProvider>
      <AppPage className="gap-5 bg-transparent p-0">
        <AppPageHeader title="Blog Detail" />
        <BlogDetailData />
      </AppPage>
    </BlogProvider>
  );
};

export default BlogDetail;

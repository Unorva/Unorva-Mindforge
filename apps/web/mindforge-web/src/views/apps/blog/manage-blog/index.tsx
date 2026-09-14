import { BlogProvider } from "src/context/blog-context";
import ManageBlogTable from "@/components/apps/blog/blogtable/manage-blogtable";
import { AppPage, AppPageHeader } from "@/components/shared/app-workspace";

const MangeBlog = () => {
  return (
    <BlogProvider>
      <AppPage className="gap-5 bg-transparent p-0">
        <AppPageHeader title="Manage Blog" />
        <ManageBlogTable />
      </AppPage>
    </BlogProvider>
  );
};

export default MangeBlog;

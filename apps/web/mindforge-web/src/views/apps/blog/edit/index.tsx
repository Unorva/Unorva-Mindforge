import { BlogProvider } from "src/context/blog-context";
import CategoryTags from "@/components/apps/blog/blogedit/category-tags";
import GeneralDetail from "@/components/apps/blog/blogedit/general-detail";
import { Button } from "@/components/ui/button";
import PostDate from "@/components/apps/blog/blogedit/post-date";
import Media from "@/components/apps/blog/blogedit/medias";
import Status from "@/components/apps/blog/blogedit/blog-status";
import { Card, CardContent } from "@/components/ui/card";
import { AppPage, AppPageHeader } from "@/components/shared/app-workspace";

const BlogEdit = () => {
  return (
    <BlogProvider>
      <AppPage className="gap-5 bg-transparent p-0">
        <AppPageHeader title="编辑博客" />
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-12 flex flex-col gap-5 lg:col-span-8">
              <GeneralDetail />
              <Media />
          </div>
          <div className="col-span-12 flex h-full flex-col gap-5 self-stretch lg:col-span-4">
              <Status />
              <CategoryTags />
              <div className="flex-1 flex flex-col">
                <PostDate />
              </div>
          </div>
          <Card className="col-span-12 lg:col-span-8">
            <CardContent className="flex flex-wrap gap-3 p-4">
              <Button className="sm:mb-0 mb-3 w-fit">保存更改</Button>
              <Button variant={"destructive"}>取消</Button>
            </CardContent>
          </Card>
        </div>
      </AppPage>
    </BlogProvider>
  );
};

export default BlogEdit;

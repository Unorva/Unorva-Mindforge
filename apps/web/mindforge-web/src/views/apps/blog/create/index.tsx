import GeneralDetail from "@/components/apps/blog/blogadd/general-detail";
import CategoryTags from "@/components/apps/blog/blogadd/category-tags";
import PostDate from "@/components/apps/blog/blogadd/post-date";
import { Button } from "@/components/ui/button";
import Media from "@/components/apps/blog/blogadd/medias";
import Status from "@/components/apps/blog/blogadd/blog-status";
import { Card, CardContent } from "@/components/ui/card";
import { AppPage, AppPageHeader } from "@/components/shared/app-workspace";

const BlogCreate = () => {
  return (
    <AppPage className="gap-5 bg-transparent p-0">
      <AppPageHeader title="Blog Create" />
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 flex flex-col gap-5 lg:col-span-8">
            <GeneralDetail />
            <Media />
        </div>
        <div className="col-span-12 flex h-full flex-col gap-5 lg:col-span-4">
            <Status />
            <CategoryTags />
            <PostDate />
        </div>
        <Card className="col-span-12 lg:col-span-8">
          <CardContent className="flex flex-wrap gap-3 p-4">
            <Button className="sm:mb-0 mb-3 w-fit">Add Blog</Button>
            <Button variant={"destructive"}>Cancel</Button>
          </CardContent>
        </Card>
      </div>
    </AppPage>
  );
};

export default BlogCreate;

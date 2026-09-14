
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BlogContext } from "src/context/blog-context";
import { useContext } from "react";
import { Label } from "@/components/ui/label";
import { CloudUpload } from "lucide-react";
import { Input } from "@/components/ui/input";

const Media = () => {
  const { posts } = useContext(BlogContext);
  const coverImage = posts.length > 0 ? posts[0].coverImg : null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            <h5>封面图片</h5>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex w-full items-center justify-center mb-4">
            <Label
              htmlFor="dropzone-file"
              className="flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-primary bg-primary/5"
            >
              {coverImage ? (
                <img
                  src={coverImage}
                  alt="博客封面"
                  className="h-full w-full object-cover rounded-lg "
                />
              ) : (
                <div className="flex flex-col items-center justify-center pb-6 pt-5">
                  <CloudUpload size={32} className="mb-3 text-primary" />
                  <p className="mb-2 text-sm text-primary ">
                    <span className="font-semibold">点击上传</span>或拖放文件
                  </p>
                  <p className="text-xs text-primary ">
                    支持 SVG、PNG、JPG 或 GIF（最大 800×400 像素）
                  </p>
                </div>
              )}
              <Input type="file" id="dropzone-file" className="hidden" />
            </Label>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default Media;

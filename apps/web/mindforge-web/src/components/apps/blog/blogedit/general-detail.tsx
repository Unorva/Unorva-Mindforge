
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useContext, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { BlogContext } from "src/context/blog-context";

const GeneralDetail = () => {
  const { posts } = useContext(BlogContext);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (posts.length > 0) {
      const firstPost = posts[0];
      setTitle(firstPost.title || "");
      setContent(firstPost.content || "");
    }
  }, [posts]);
  console.log(title);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            <h5>博客详情</h5>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="mb-2">
              <Label htmlFor="prednm ">
                博客标题 <span className="text-destructive ">*</span>
              </Label>
            </div>
            <Input
              id="prednm"
              type="text"
              placeholder="请输入博客标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <small className="text-xs  text-muted-foreground">
              博客标题为必填项，建议使用唯一标题。
            </small>
          </div>
          <div>
            <div className="mb-2 block">
              <Label htmlFor="desc">正文内容</Label>
            </div>
            <Textarea
              id="comment"
              placeholder="请输入博客正文……"
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <small className="text-xs text-muted-foreground ">
              完善正文内容，让博客更易于阅读和发现。
            </small>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default GeneralDetail;

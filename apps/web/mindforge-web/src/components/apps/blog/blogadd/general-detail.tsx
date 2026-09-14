
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TiptapEdit from "../editor/tiptap-edit";



const GeneralDetail = () => {
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
            <div className="mb-2 block">
              <Label htmlFor="prednm">
                博客标题
                <span className="text-destructive ">*</span>
              </Label>
            </div>
            <Input id="prednm" type="text" placeholder="请输入博客标题" />
            <small className="text-xs text-muted-foreground">
              博客标题为必填项，建议使用唯一标题。
            </small>
          </div>
          <div>
            <div className="mb-2 block">
              <Label htmlFor="desc">正文内容</Label>
            </div>
            <TiptapEdit />
            <small className="text-xs  text-muted-foreground">
              完善正文内容，让博客更易于阅读和发现。
            </small>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default GeneralDetail;

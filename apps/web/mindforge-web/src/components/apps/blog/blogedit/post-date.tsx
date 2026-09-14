

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useState, useContext, useEffect } from "react";
import { BlogContext } from "src/context/blog-context";
// ShadCN UI Date Picker components
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CalendarCog } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";

const PostDate = () => {
  const { posts } = useContext(BlogContext);

  const [publishDate, setPublishDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    if (posts.length > 0 && posts[0].createdAt) {
      setPublishDate(new Date(posts[0].createdAt));
    }
  }, [posts]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>
          <h5>发布日期</h5>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div>
          <div className="mb-2 block">
            <Label htmlFor="publishDate">
              选择发布日期 <span className="text-destructive">*</span>
            </Label>
          </div>
          <div>
            <Popover>
              <PopoverTrigger className={"w-full"}>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !publishDate && "text-muted-foreground"
                  )}
                >
                  <CalendarCog />
                  {publishDate ? (
                    format(publishDate, "PPP", { locale: zhCN })
                  ) : (
                    <span>选择日期</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start">
                <Calendar
                  mode="single"
                  selected={publishDate}
                  onSelect={setPublishDate}
                  locale={zhCN}
                />
              </PopoverContent>
            </Popover>
          </div>
          <small className="text-xs text-muted-foreground">
            选择这篇博客的发布日期。
          </small>
        </div>
      </CardContent>
    </Card>
  );
};

export default PostDate;

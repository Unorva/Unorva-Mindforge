
import React, { useEffect, useContext } from "react";

import { Circle, Eye, MessageSquare, Quote } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { uniqueId } from "lodash";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "react-router";
import {
  BlogContext,
  BlogContextProps,
} from "../../../../context/blog-context/index";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import BlogComment from "./blog-commnets";
import { BlogType } from "src/types/apps/blog";

const BlogDetailData = () => {
  const { posts, setLoading, addComment }: BlogContextProps =
    useContext(BlogContext);
  const location = useLocation();
  const pathName = location.pathname;

  const getTitle = decodeURIComponent(pathName.split("/").pop() || "");
  const post = posts.find(
    (p) =>
      (p.title || "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\p{L}\p{N}-]+/gu, "") === getTitle
  );
  const [replyTxt, setReplyTxt] = React.useState("");

  const onSubmit = () => {
    if (!post || !post.id) return;
    const newComment = {
      id: uniqueId("#comm_"),
      profile: {
        id: uniqueId("#USER_"),
        avatar: post.author?.avatar || "",
        name: post.author?.name || "",
        time: "刚刚",
      },
      comment: replyTxt,
      replies: [],
    };
    addComment(post.id, newComment);
    setReplyTxt("");
  };

  // skeleton
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 700);

    return () => clearTimeout(timer);
  }, [setLoading]);

  return (
    <>
      {post ? (
        <>
          <Card className="py-0! overflow-hidden gap-0!">
            <div className="relative">
              <div className="overflow-hidden h-[450px]">
                <img
                  src={post?.coverImg || ""}
                  alt={post?.title || "博客封面"}
                  className="w-full h-full object-cover object-center"
                />
              </div>

              <Badge

                className="absolute bottom-8 end-6 bg-muted text-muted-foreground"
              >
                阅读约 2 分钟
              </Badge>
            </div>
            <div className="flex justify-between items-center -mt-7 px-6">
              <div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Avatar className="cursor-pointer h-10 w-10">
                        <AvatarImage
                          src={post?.author?.avatar}
                          alt={post?.author?.name}
                        />
                        <AvatarFallback>
                          {post?.author?.name?.charAt(0) ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{post?.author?.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="px-6 pb-6">
              <Badge className="mt-3 " variant={"secondary"}>
                {post?.category}
              </Badge>
              <h2 className="md:text-4xl text-2xl my-6">{post?.title}</h2>
              <div>
                <div className="flex gap-3">
                  <div className="flex gap-2 items-center text-sm ">
                    <Eye size={18} />
                    {post?.view}
                  </div>
                  <div className="flex gap-2 items-center  text-sm">
                    <MessageSquare size={18} />{" "}
                    {post?.comments?.length || 0}
                  </div>
                  <div className="ms-auto flex gap-2 items-center   text-sm">
                    <Circle size={7} />
                    <small>
                      {post && post.createdAt
                        ? format(new Date(post.createdAt), "M月d日 EEE", { locale: zhCN })
                        : ""}
                    </small>
                  </div>
                </div>
              </div>
            </div>
            <Separator className="my-8" />
            <div className="px-6 pb-6">
              <h2 className="md:text-3xl text-2xl pb-5">
                开始一段更专注的阅读
              </h2>
              <p>
                面对持续涌入的信息，我们真正需要的往往不是更多内容，而是一套能够帮助自己判断、整理和行动的方法。先明确问题，再收集与问题直接相关的材料，能够显著减少无效浏览带来的注意力消耗。
              </p>
              <br></br>
              <p>
                一个简单的做法是：阅读时只记录关键事实、自己的理解以及下一步行动。这样既保留了思考过程，也让笔记在未来真正可检索、可复用，并逐渐形成属于自己的知识体系。
              </p>
              <br></br>
              <p>
                <b>重要内容可以使用粗体突出显示。</b>
              </p>
              <i>补充说明可以使用斜体呈现。</i>

              <Separator className="my-8" />
              <h3 className="text-xl mb-3">无序列表</h3>
              <ul className="list-disc pl-6">
                <li>明确当前要解决的问题</li>
                <li>收集与问题相关的信息</li>
                <li>记录自己的判断和依据</li>
                <li>删除重复或无关的内容</li>
                <li>补充可检索的标签</li>
                <li>确定下一步行动</li>
              </ul>
              <Separator className="my-8" />
              <h3 className="text-xl mb-3">有序列表</h3>
              <ol className="list-decimal pl-6">
                <li>先写下核心结论</li>
                <li>补充事实与上下文</li>
                <li>检查信息是否可靠</li>
                <li>整理成清晰结构</li>
                <li>关联已有笔记</li>
                <li>安排后续复盘</li>
              </ol>
              <Separator className="my-8" />
              <h3 className="text-xl mb-3">引用</h3>
              <div className="pt-5 pb-4 px-4 rounded-md border-s-2 border-primary flex gap-1 items-start bg-primary/5">
                <Quote size={20} className="-mt-1" />
                <h2 className="text-base font-bold">
                  生活很短，趁还能微笑时尽情微笑。
                </h2>
              </div>
            </div>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>
                <h5 className="text-xl mb-2">发表评论</h5>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={4}
                placeholder="写下你的评论……"
                value={replyTxt}
                onChange={(e) => setReplyTxt(e.target.value)}
              ></Textarea>
              <Button
                variant={"default"}
                className="w-fit mt-3 rounded-md "
                onClick={onSubmit}
              >
                发表评论
              </Button>
              <div className="mt-6">
                <div className="flex gap-3 items-center">
                  <h5 className="text-xl ">评论</h5>
                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-primary bg-primary/5 font-bold">
                    {post?.comments?.length || 0}
                  </div>
                </div>
                <div>
                  {post?.comments?.map((comment: BlogType) => {
                    return <BlogComment key={comment.id} comment={comment} />;
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-xl text-center py-6 font-bold">未找到博客文章</p>
      )}
    </>
  );
};
export default BlogDetailData;

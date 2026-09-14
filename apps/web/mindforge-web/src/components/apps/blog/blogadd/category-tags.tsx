
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "@/components/ui/combobox";
import { Plus } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CategoryTags = () => {
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>("");

  const [Cats, setCats] = useState<string[]>([]);
  const [catOptions] = useState<string[]>([
    "科技",
    "生活方式",
    "旅行",
    "美食",
    "商业",
    "社交",
  ]);

  const [tagOptions] = useState<string[]>([
    "热门",
    "技巧",
    "新闻",
    "指南",
    "流行",
  ]);

  const handleTagInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const nextTag = tagInput.trim();
    if (event.key === "Enter" && nextTag) {
      event.preventDefault();
      if (!tags.includes(nextTag)) setTags([...tags, nextTag]);
      setTagInput("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>博客分类</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="">
          <div className="mb-2 block">
            <Label htmlFor="cat">
              分类
              <span className="text-destructive">*</span>
            </Label>
          </div>

          <div>
            <Combobox items={catOptions} multiple onValueChange={setCats} value={Cats}>
              <ComboboxChips>
                <ComboboxValue>
                  {Cats.map((cat) => <ComboboxChip key={cat}>{cat}</ComboboxChip>)}
                </ComboboxValue>
                <ComboboxChipsInput aria-label="分类" id="cat" placeholder="选择分类" />
              </ComboboxChips>
              <ComboboxContent>
                <ComboboxEmpty>未找到分类</ComboboxEmpty>
                <ComboboxList>{(option) => <ComboboxItem key={option} value={option}>{option}</ComboboxItem>}</ComboboxList>
              </ComboboxContent>
            </Combobox>
            <small className="text-xs text-muted-foreground">
              为博客选择一个或多个分类。
            </small>
          </div>
        </div>

        <div className="mt-2">
          <Button variant="outline" >
            <Plus size={18} /> 添加所选分类
          </Button>
        </div>

        <div className="mt-4">
          <div className="mb-2 block">
            <Label htmlFor="tags">标签</Label>
          </div>

          <div>
            <Combobox
              inputValue={tagInput}
              items={tagOptions}
              multiple
              onInputValueChange={setTagInput}
              onValueChange={setTags}
              value={tags}
            >
              <ComboboxChips>
                <ComboboxValue>
                  {tags.map((tag) => <ComboboxChip key={tag}>{tag}</ComboboxChip>)}
                </ComboboxValue>
                <ComboboxChipsInput aria-label="标签" id="tags" onKeyDown={handleTagInputKeyDown} placeholder="添加标签" />
              </ComboboxChips>
              <ComboboxContent>
                <ComboboxEmpty>按回车键创建此标签</ComboboxEmpty>
                <ComboboxList>{(option) => <ComboboxItem key={option} value={option}>{option}</ComboboxItem>}</ComboboxList>
              </ComboboxContent>
            </Combobox>
            <small className="text-xs text-muted-foreground">
              为博客添加标签。
            </small>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryTags;

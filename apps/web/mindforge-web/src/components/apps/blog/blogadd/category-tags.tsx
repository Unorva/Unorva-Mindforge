
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
    "Technology",
    "Lifestyle",
    "Travel",
    "Food",
    "Business",
    "social",
  ]);

  const [tagOptions] = useState<string[]>([
    "Trending",
    "Tips",
    "News",
    "Guide",
    "Popular",
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
        <CardTitle>Blog Category</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="">
          <div className="mb-2 block">
            <Label htmlFor="cat">
              Categories
              <span className="text-destructive">*</span>
            </Label>
          </div>

          <div>
            <Combobox items={catOptions} multiple onValueChange={setCats} value={Cats}>
              <ComboboxChips>
                <ComboboxValue>
                  {Cats.map((cat) => <ComboboxChip key={cat}>{cat}</ComboboxChip>)}
                </ComboboxValue>
                <ComboboxChipsInput aria-label="Categories" id="cat" placeholder="Select categories" />
              </ComboboxChips>
              <ComboboxContent>
                <ComboboxEmpty>No categories found.</ComboboxEmpty>
                <ComboboxList>{(option) => <ComboboxItem key={option} value={option}>{option}</ComboboxItem>}</ComboboxList>
              </ComboboxContent>
            </Combobox>
            <small className="text-xs text-muted-foreground">
              Add blog to a category.
            </small>
          </div>
        </div>

        <div className="mt-2">
          <Button variant="outline" >
            <Plus size={18} /> Add selected category
          </Button>
        </div>

        <div className="mt-4">
          <div className="mb-2 block">
            <Label htmlFor="tags">Tags</Label>
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
                <ComboboxChipsInput aria-label="Tags" id="tags" onKeyDown={handleTagInputKeyDown} placeholder="Add tags" />
              </ComboboxChips>
              <ComboboxContent>
                <ComboboxEmpty>Press Enter to create this tag.</ComboboxEmpty>
                <ComboboxList>{(option) => <ComboboxItem key={option} value={option}>{option}</ComboboxItem>}</ComboboxList>
              </ComboboxContent>
            </Combobox>
            <small className="text-xs text-muted-foreground">
              Add tags for blog.
            </small>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryTags;


import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statuses = ["草稿", "定时发布", "已发布", "未启用"];
const Status = () => {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(
    "已发布"
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex justify-between items-center">
            <h5>博客状态</h5>
            {selectedStatus === "已发布" ? (
              <span className="h-3 w-3 p-0 bg-chart-2 rounded-full" />
            ) : selectedStatus === "定时发布" ? (
              <span className="h-3 w-3 p-0 rounded-full" />
            ) : selectedStatus === "草稿" ? (
              <span className="h-3 w-3 p-0 rounded-full" />
            ) : (
              <span className="h-3 w-3 p-0 bg-chart-4 rounded-full" />
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div>
          <Select
            value={selectedStatus}
            onValueChange={(value) => {
              setSelectedStatus(value);
            }}
            defaultValue={"请选择状态"}

          >
            <SelectTrigger className="select-md w-full" id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>状态</SelectLabel>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <small className="text-xs text-muted-foreground">
            设置博客的发布状态。
          </small>
        </div>
      </CardContent>
    </Card>
  );
};

export default Status;

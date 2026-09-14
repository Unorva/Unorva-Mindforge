
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FileUploadMotion from "@/components/animated-components/file-uploadmotion";

const Media = () => {
  return (
    <>
       <Card>
        <CardHeader>
          <CardTitle>
            <h5>封面图片</h5>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FileUploadMotion />
        </CardContent>
      </Card>
    </>
  );
};

export default Media;

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

const Test = () => {
  const handleContinue = () => {
    // 在这里执行删除、提交等真正操作
    console.log("已确认")
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" />}>
        显示确认框
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认继续吗？</AlertDialogTitle>
          <AlertDialogDescription>
            此操作执行后无法撤销，请确认是否继续。
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={handleContinue}>
            确认
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default Test

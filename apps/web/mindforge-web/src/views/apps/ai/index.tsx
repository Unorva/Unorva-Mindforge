import AiAssistant from '@/components/apps/ai'
import { AppPage, AppPageHeader } from '@/components/shared/app-workspace'

export default function AiPage() {
  return (
    <AppPage className="gap-5 bg-transparent p-0">
      <AppPageHeader title="AI 助手" />
      <AiAssistant />
    </AppPage>
  )
}

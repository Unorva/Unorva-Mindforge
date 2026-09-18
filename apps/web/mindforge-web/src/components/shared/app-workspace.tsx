import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import BreadcrumbComp from '@/layouts/full/shared/breadcrumb/BreadcrumbComp'
import StyleDivider from '@/components/shared/StyleDivider'

type AppPageHeaderProps = {
  extra?: ReactNode
  items?: Array<{
    title: string
    to?: string
  }>
  showHome?: boolean
  title: string
}

const APP_WORKSPACE_HEIGHT_CLASS = 'h-[calc(100dvh-13rem)] min-h-[640px]'

/**
 * 与各应用页保持同一层级：顶部是标准面包屑标题卡，
 * 下方再放各业务自己的卡片或工作区，避免为业务页另起一套视觉语言。
 */
function AppPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex min-h-0 w-full flex-col gap-px bg-border p-px', className)}>{children}</div>
}

function AppPageHeader({ extra, items, showHome, title }: AppPageHeaderProps) {
  return <BreadcrumbComp extra={extra} items={items} showHome={showHome} title={title} />
}

function AppPageDivider() {
  return <StyleDivider />
}

function AppWorkspace({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn(APP_WORKSPACE_HEIGHT_CLASS, 'overflow-hidden rounded-none bg-background', className)}>
      {children}
    </section>
  )
}

export { APP_WORKSPACE_HEIGHT_CLASS, AppPage, AppPageDivider, AppPageHeader, AppWorkspace }

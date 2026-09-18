import { useState } from 'react'
import { Bot, Play, RotateCcw, SlidersHorizontal } from 'lucide-react'

import {
  AI_AVATAR_EXPRESSIONS,
  AI_AVATAR_VISUALS,
  AiAvatar,
  type AiAvatarExpression,
  useAiAvatarController,
} from '@/components/ai-avatar'
import { AppPage, AppPageHeader } from '@/components/shared/app-workspace'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

const MIN_SIZE = 120
const MAX_SIZE = 360

export default function AiAvatarTestPage() {
  const avatar = useAiAvatarController('idle')
  const [selectedExpression, setSelectedExpression] = useState<AiAvatarExpression>('idle')
  const [intensity, setIntensity] = useState(0.65)
  const [size, setSize] = useState(260)

  const applyExpression = (expression: AiAvatarExpression) => {
    setSelectedExpression(expression)
    avatar.play({ expression, intensity })
  }

  const updateIntensity = (nextIntensity: number) => {
    setIntensity(nextIntensity)
    avatar.play({ expression: avatar.expression, intensity: nextIntensity })
  }

  const reset = () => {
    setSelectedExpression('idle')
    setIntensity(0.65)
    setSize(260)
    avatar.reset()
  }

  return (
    <AppPage className="gap-5 bg-transparent p-0">
      <AppPageHeader
        extra={(
          <Badge className="hidden gap-1.5 bg-primary/10! text-primary! sm:inline-flex" variant="secondary">
            <Bot size={13} />
            34 种表情
          </Badge>
        )}
        showHome={false}
        title="AI 动画组件"
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-h-[520px] justify-center bg-[radial-gradient(circle_at_center,var(--muted),transparent_68%)]">
          <CardContent className="flex flex-col items-center justify-center gap-6 py-10">
            <AiAvatar
              expression={avatar.expression}
              intensity={avatar.intensity}
              size={size}
            />
            <div className="text-center">
              <p className="text-xl font-semibold">{AI_AVATAR_VISUALS[avatar.expression].label}</p>
              <p className="mt-1 font-mono text-sm text-muted-foreground">{avatar.expression}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal size={17} />
              交互控制
            </CardTitle>
            <CardDescription>修改参数，检查组件在不同状态下的动画表现。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="avatar-intensity">动画强度</Label>
                <span className="font-mono text-xs text-muted-foreground">{intensity.toFixed(2)}</span>
              </div>
              <input
                aria-label="动画强度"
                className="h-2 w-full cursor-pointer accent-foreground"
                id="avatar-intensity"
                max="1"
                min="0.2"
                onChange={(event) => updateIntensity(Number(event.target.value))}
                step="0.05"
                type="range"
                value={intensity}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="avatar-size">组件尺寸</Label>
                <span className="font-mono text-xs text-muted-foreground">{size}px</span>
              </div>
              <input
                aria-label="组件尺寸"
                className="h-2 w-full cursor-pointer accent-foreground"
                id="avatar-size"
                max={MAX_SIZE}
                min={MIN_SIZE}
                onChange={(event) => setSize(Number(event.target.value))}
                step="10"
                type="range"
                value={size}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
              <Button onClick={() => applyExpression(selectedExpression)}>
                <Play />
                应用当前表情
              </Button>
              <Button
                onClick={() => avatar.play({
                  durationMs: 2000,
                  expression: selectedExpression,
                  intensity,
                  returnTo: 'idle',
                })}
                variant="outline"
              >
                播放 2 秒后待机
              </Button>
              <Button onClick={reset} variant="ghost">
                <RotateCcw />
                重置参数
              </Button>
            </div>

            <div className="rounded-lg bg-muted p-4 font-mono text-xs leading-6 text-muted-foreground">
              <div>{'{'}</div>
              <div className="pl-4">expression: '{selectedExpression}',</div>
              <div className="pl-4">intensity: {intensity.toFixed(2)},</div>
              <div className="pl-4">durationMs: 2000,</div>
              <div className="pl-4">returnTo: 'idle'</div>
              <div>{'}'}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>全部表情</CardTitle>
          <CardDescription>点击任意卡片，将该表情加载到上方主预览。</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
          {AI_AVATAR_EXPRESSIONS.map((expression) => {
            const visual = AI_AVATAR_VISUALS[expression]
            const isSelected = selectedExpression === expression

            return (
              <button
                aria-pressed={isSelected}
                className="group flex min-h-36 flex-col items-center justify-center gap-2 rounded-xl border bg-background p-3 text-center transition-colors hover:bg-muted/70 aria-pressed:border-foreground aria-pressed:bg-muted"
                key={expression}
                onClick={() => applyExpression(expression)}
                type="button"
              >
                <AiAvatar ariaLabel={`${visual.label}表情预览`} expression={expression} intensity={0.5} size={78} />
                <span className="font-medium">{visual.label}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{expression}</span>
              </button>
            )
          })}
        </CardContent>
      </Card>
    </AppPage>
  )
}

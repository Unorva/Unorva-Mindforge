import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useReducedMotion } from 'motion/react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, type BarShapeProps } from 'recharts'

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart'
import { cn } from '@/lib/utils'

export type SegmentedBarChartDatum = {
  category: string
} & Record<string, number | string>

export type SegmentedBarChartSeries = {
  color: string
  key: string
  label: string
}

export type SegmentedMultipleBarChartProps = {
  action?: ReactNode
  animationDuration?: number
  className?: string
  compact?: boolean
  data: SegmentedBarChartDatum[]
  description?: ReactNode
  height?: number
  maxChartWidth?: number
  maxValue?: number
  minChartWidth?: number
  segmentGap?: number
  segmentStep?: number
  series: SegmentedBarChartSeries[]
  showLegend?: boolean
  title?: ReactNode
  valueFormatter?: (value: number) => string
}

type SegmentedBarShapeProps = BarShapeProps & {
  domainMax: number
  segmentGap: number
  segmentStep: number
}

type TooltipPayloadItem = {
  color?: string
  dataKey?: number | string
  name?: number | string
  value?: Array<number | string> | number | string
}

type SegmentedTooltipContentProps = {
  active?: boolean
  label?: number | string
  payload?: readonly TooltipPayloadItem[]
  series: SegmentedBarChartSeries[]
  valueFormatter: (value: number) => string
}

const defaultValueFormatter = (value: number) => value.toLocaleString('zh-CN')

function useAnimatedBarData(
  data: SegmentedBarChartDatum[],
  seriesKeySignature: string,
  duration: number,
  reduceMotion: boolean,
) {
  const [renderedData, setRenderedData] = useState(data)
  const renderedDataRef = useRef(data)
  const animationFrameRef = useRef<number | null>(null)
  const dataSignature = data
    .map((item) => `${item.category}:${seriesKeySignature.split('|').map((key) => item[key]).join(',')}`)
    .join(';')
  const dataSignatureRef = useRef(dataSignature)

  useEffect(() => {
    if (dataSignatureRef.current === dataSignature) return
    dataSignatureRef.current = dataSignature

    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current)

    if (reduceMotion || duration <= 0) {
      renderedDataRef.current = data
      setRenderedData(data)
      return
    }

    const sourceData = renderedDataRef.current
    const seriesKeys = seriesKeySignature.split('|')
    const startedAt = performance.now()

    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1)
      const easedProgress = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2

      const nextData = data.map((target, index) => {
        const source = sourceData[index]
        const next: SegmentedBarChartDatum = { ...target }

        seriesKeys.forEach((key) => {
          const sourceValue = Number(source?.[key]) || 0
          const targetValue = Number(target[key]) || 0
          next[key] = sourceValue + (targetValue - sourceValue) * easedProgress
        })

        return next
      })

      renderedDataRef.current = nextData
      setRenderedData(nextData)

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        animationFrameRef.current = null
        renderedDataRef.current = data
        setRenderedData(data)
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [data, dataSignature, duration, reduceMotion, seriesKeySignature])

  return renderedData
}

function SegmentedBarShape({
  background,
  domainMax,
  fill,
  height,
  isActive,
  segmentGap,
  segmentStep,
  value,
  width,
  x,
  y,
}: SegmentedBarShapeProps) {
  const numericValue = Array.isArray(value) ? value[1] - value[0] : value

  if (!numericValue || height <= 0 || width <= 0) return null

  const segmentCount = Math.max(1, Math.ceil(numericValue / segmentStep))
  const backgroundY = background?.y
  const backgroundHeight = background?.height
  const hasBackgroundGeometry = backgroundY != null && backgroundHeight != null
  const plotHeight = hasBackgroundGeometry ? backgroundHeight : (height / numericValue) * domainMax
  const baselineY = hasBackgroundGeometry ? backgroundY + backgroundHeight : y + height
  const segmentSlotHeight = (plotHeight * segmentStep) / domainMax
  const actualGap = Math.min(segmentGap, segmentSlotHeight * 0.45)
  const fullSegmentHeight = Math.max(0.75, segmentSlotHeight - actualGap)

  return (
    <g opacity={isActive ? 0.78 : 1}>
      {Array.from({ length: segmentCount }, (_, index) => {
        const segmentValue = Math.min(segmentStep, numericValue - index * segmentStep)
        const segmentHeight = Math.max(0.5, fullSegmentHeight * (segmentValue / segmentStep))
        const segmentY = baselineY - index * segmentSlotHeight - segmentHeight

        return (
          <rect
            fill={fill}
            height={segmentHeight}
            key={index}
            rx={0.75}
            width={width}
            x={x}
            y={segmentY}
          />
        )
      })}
    </g>
  )
}

function SegmentedTooltipContent({
  active,
  label,
  payload,
  series,
  valueFormatter,
}: SegmentedTooltipContentProps) {
  if (!active || !payload?.length) return null

  const seriesByKey = new Map(series.map((item) => [item.key, item]))
  const items = payload.filter((item) => typeof item.value === 'number')

  return (
    <div className="grid min-w-40 gap-2 rounded-lg border border-border/70 bg-popover px-3 py-2 text-xs text-popover-foreground shadow-xl">
      <p className="font-medium">{label}</p>
      <div className="grid gap-1.5">
        {items.map((item) => {
          const key = String(item.dataKey ?? '')
          const currentSeries = seriesByKey.get(key)

          return (
            <div className="flex items-center gap-2" key={key}>
              <span
                aria-hidden="true"
                className="size-2 rounded-[2px]"
                style={{ backgroundColor: currentSeries?.color ?? item.color }}
              />
              <span className="text-muted-foreground">{currentSeries?.label ?? item.name}</span>
              <span className="ml-auto font-mono font-medium tabular-nums">
                {valueFormatter(item.value as number)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SegmentedMultipleBarChart({
  action,
  animationDuration = 680,
  className,
  compact = false,
  data,
  description,
  height,
  maxChartWidth,
  maxValue,
  minChartWidth,
  segmentGap = 2,
  segmentStep = 200,
  series,
  showLegend,
  title,
  valueFormatter = defaultValueFormatter,
}: SegmentedMultipleBarChartProps) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(() => new Set())
  const reduceMotion = useReducedMotion()
  const resolvedHeight = height ?? (compact ? 76 : 290)
  const resolvedMinChartWidth = minChartWidth ?? (compact ? 112 : 620)
  const shouldShowLegend = showLegend ?? !compact
  const seriesKeySignature = series.map((item) => item.key).join('|')
  const renderedData = useAnimatedBarData(data, seriesKeySignature, animationDuration, Boolean(reduceMotion))

  const chartConfig = useMemo(
    () => Object.fromEntries(series.map((item) => [item.key, { color: item.color, label: item.label }])) as ChartConfig,
    [series],
  )

  const domainMax = useMemo(() => {
    if (maxValue) return maxValue

    const highestValue = data.reduce(
      (highest, item) => Math.max(highest, ...series.map(({ key }) => Number(item[key]) || 0)),
      0,
    )
    const interval = Math.max(segmentStep * (compact ? 1 : 5), 1)
    return Math.max(interval, Math.ceil(highestValue / interval) * interval)
  }, [compact, data, maxValue, segmentStep, series])

  const yAxisFormatter = (value: number) => {
    if (Math.abs(value) >= 1000) {
      const compactValue = value / 1000
      return `${Number.isInteger(compactValue) ? compactValue : compactValue.toFixed(1)}k`
    }
    return String(value)
  }

  const toggleSeries = (key: string) => {
    setHiddenSeries((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else if (next.size < series.length - 1) next.add(key)
      return next
    })
  }

  const chartContent = (
    <>
      <div className={cn(!compact && 'overflow-x-auto pb-1')}>
        <div
          className="mx-auto"
          style={{ maxWidth: maxChartWidth, minWidth: resolvedMinChartWidth }}
        >
            <ChartContainer
              className="aspect-auto! w-full"
              config={chartConfig}
              initialDimension={{ height: resolvedHeight, width: resolvedMinChartWidth }}
              style={{ height: resolvedHeight }}
            >
              <BarChart
                accessibilityLayer
                barCategoryGap={compact ? '12%' : '28%'}
                barGap={2}
                data={renderedData}
                margin={compact
                  ? { bottom: 2, left: 2, right: 2, top: 2 }
                  : { bottom: 4, left: -4, right: 4, top: 4 }}
              >
                {compact ? (
                  <>
                    <XAxis dataKey="category" hide />
                    <YAxis domain={[0, domainMax]} hide />
                  </>
                ) : (
                  <>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                    <XAxis
                      axisLine={false}
                      dataKey="category"
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                      tickLine={false}
                      tickMargin={10}
                    />
                    <YAxis
                      axisLine={false}
                      domain={[0, domainMax]}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                      tickCount={5}
                      tickFormatter={yAxisFormatter}
                      tickLine={false}
                      tickMargin={8}
                      width={44}
                    />
                  </>
                )}
                <ChartTooltip
                  content={<SegmentedTooltipContent series={series} valueFormatter={valueFormatter} />}
                  cursor={{ fill: 'var(--muted)', opacity: 0.45 }}
                />
                {series.map((item) => (
                  <Bar
                    barSize={compact ? 10 : 12}
                    dataKey={item.key}
                    fill={`var(--color-${item.key})`}
                    hide={hiddenSeries.has(item.key)}
                    isAnimationActive={false}
                    key={item.key}
                    name={item.label}
                    shape={(shapeProps: BarShapeProps) => (
                      <SegmentedBarShape
                        {...shapeProps}
                        domainMax={domainMax}
                        segmentGap={segmentGap}
                        segmentStep={segmentStep}
                      />
                    )}
                  />
                ))}
              </BarChart>
            </ChartContainer>
        </div>
      </div>

      {shouldShowLegend && (
        <div aria-label="图表图例" className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {series.map((item) => {
            const hidden = hiddenSeries.has(item.key)
            return (
              <button
                aria-pressed={!hidden}
                className={cn(
                  'flex cursor-pointer items-center gap-1.5 rounded-sm text-xs text-foreground transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  hidden && 'opacity-35',
                )}
                key={item.key}
                onClick={() => toggleSeries(item.key)}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className="size-2 rounded-[2px]"
                  style={{ backgroundColor: item.color } as CSSProperties}
                />
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </>
  )

  if (compact) {
    return (
      <div className={cn('shrink-0', className)} data-testid="segmented-multiple-bar-chart" data-variant="compact">
        {chartContent}
      </div>
    )
  }

  return (
    <Card className={cn('gap-0! py-0', className)} data-testid="segmented-multiple-bar-chart">
      {(title || description || action) && (
        <CardHeader className="border-b border-border py-4">
          <div className="grid gap-1">
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {action && <CardAction>{action}</CardAction>}
        </CardHeader>
      )}
      <CardContent className="p-4 sm:p-5">
        {chartContent}
      </CardContent>
    </Card>
  )
}

export { SegmentedMultipleBarChart }

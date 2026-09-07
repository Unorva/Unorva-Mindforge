import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Calendar as CalendarIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

type ProjectDatePickerProps = {
  disabled?: boolean
  onChange: (value: string) => void
  placeholder?: string
  value: string
}

function toDate(value: string) {
  if (!value) return undefined
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

// 按 shadcn Date Picker 的 Popover + Calendar 组合实现，存储格式与现有本地数据保持一致。
export function ProjectDatePicker({ disabled = false, onChange, placeholder = '选择日期', value }: ProjectDatePickerProps) {
  const date = toDate(value)

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            className="w-full justify-start text-left font-normal data-[empty=true]:text-muted-foreground"
            data-empty={!date}
            disabled={disabled}
            variant="outline"
          />
        }
      >
        <CalendarIcon />
        {date ? format(date, 'PPP', { locale: zhCN }) : <span>{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          locale={zhCN}
          mode="single"
          onSelect={(selectedDate) => onChange(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '')}
          selected={date}
        />
      </PopoverContent>
    </Popover>
  )
}

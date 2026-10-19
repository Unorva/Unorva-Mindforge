import type { ReactNode } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function MailSelect({
  id,
  label,
  value,
  options,
  onChange,
  disabled,
  iconFor,
}: {
  id?: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
  iconFor?: (value: string) => ReactNode;
}) {
  return (
    <Select
      items={options}
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (next !== null) onChange(next);
      }}
    >
      <SelectTrigger id={id} aria-label={label} className="w-full">
        {iconFor && <span data-slot="mail-select-icon" className="flex shrink-0 items-center">{iconFor(value)}</span>}
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {iconFor && <span className="flex shrink-0 items-center">{iconFor(option.value)}</span>}
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

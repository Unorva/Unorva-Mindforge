import { useState } from 'react';
import { Check } from 'lucide-react';
import type { MailAccount } from '@/api/mail/mail';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@/components/ui/popover';
import { MailProviderLogo } from './mail-provider-logo';

export default function AccountSwitcher({
  accounts,
  value,
  onChange,
}: {
  accounts: MailAccount[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = accounts.find((account) => String(account.id) === value);
  const label = selected?.displayName || selected?.email || '全部邮箱';
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button size="icon-sm" variant="ghost" aria-label={`切换邮箱，当前：${label}`} />}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          {[5, 12, 19].flatMap((y) =>
            [5, 12, 19].map((x) => <circle key={`${x}:${y}`} cx={x} cy={y} r="1.5" />),
          )}
        </svg>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-80 overflow-y-auto">
        <PopoverTitle className="px-2 pt-1 text-xs text-muted-foreground">选择邮箱</PopoverTitle>
        <div className="space-y-1" role="group" aria-label="邮箱筛选">
          {[
            { value: 'all', label: '全部邮箱', email: '', provider: undefined },
            ...accounts.map((account) => ({
              value: String(account.id),
              label: `${account.displayName || account.email}${account.enabled ? '' : '（已停用）'}`,
              email: account.displayName ? account.email : '',
              provider: account.provider,
            })),
          ].map((option) => (
            <Button
              key={option.value}
              variant={value === option.value ? 'secondary' : 'ghost'}
              className="h-auto min-h-9 w-full justify-start py-2 text-left"
              aria-pressed={value === option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <MailProviderLogo provider={option.provider} size="xs" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{option.label}</span>
                {option.email && (
                  <span className="block truncate text-xs font-normal text-muted-foreground">
                    {option.email}
                  </span>
                )}
              </span>
              {value === option.value && <Check className="shrink-0" />}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

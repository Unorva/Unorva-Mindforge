import { useNavigate, useSearchParams } from 'react-router';
import AccountSettingsDialog from '@/components/account-settings';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'mail' ? 'mail' : 'ai';
  return (
    <AccountSettingsDialog
      key={initialTab}
      open
      initialTab={initialTab}
      onOpenChange={(open) => {
        if (!open) navigate(initialTab === 'mail' ? '/apps/mail' : '/', { replace: true });
      }}
    />
  );
}

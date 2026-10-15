import { useNavigate } from 'react-router';
import AccountSettingsDialog from '@/components/account-settings';

export default function SettingsPage() {
  const navigate = useNavigate();
  return (
    <AccountSettingsDialog
      open
      onOpenChange={(open) => {
        if (!open) navigate('/apps/ai');
      }}
    />
  );
}

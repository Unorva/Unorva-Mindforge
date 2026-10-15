import { Home, Settings, User, type LucideIcon } from 'lucide-react';

interface ProfileItem {
  avatar: LucideIcon;
  title: string;
  href?: string;
  badge: boolean;
  action?: 'open-profile' | 'open-account-settings';
}

const profileDD: ProfileItem[] = [
  { avatar: Home, title: '工作台', href: '/', badge: false },
  { avatar: User, title: '个人资料', badge: false, action: 'open-profile' },
  { avatar: Settings, title: '账户设置', badge: false, action: 'open-account-settings' },
];

export { profileDD };

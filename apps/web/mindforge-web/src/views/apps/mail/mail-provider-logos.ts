import gmail from '@/assets/images/mail-providers/gmail.ico';
import icloud from '@/assets/images/mail-providers/icloud.png';
import netease from '@/assets/images/mail-providers/netease.png';
import outlook from '@/assets/images/mail-providers/outlook.ico';
import qq from '@/assets/images/mail-providers/qq.png';

/** 官网标签页图标随包发布，来源见资源目录中的 README.md。 */
export interface MailProviderLogoData {
  src: string;
}

export const MAIL_PROVIDER_LOGOS: Record<string, MailProviderLogoData> = {
  gmail: { src: gmail },
  outlook: { src: outlook },
  qq: { src: qq },
  icloud: { src: icloud },
  '163': { src: netease },
  '126': { src: netease },
};

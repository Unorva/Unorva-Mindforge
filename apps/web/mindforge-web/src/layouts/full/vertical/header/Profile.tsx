

import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetFooter,
  SheetClose,
} from "src/components/ui/sheet";
import { Avatar, AvatarImage, AvatarFallback } from "src/components/ui/avatar";
import { Button } from "src/components/ui/button";
import { Icon } from "@iconify/react";

import { cn } from "src/lib/utils";
import { Mailbox } from 'lucide-react';

import { profileDD } from "./data";
import { Link, useNavigate } from "react-router";
import avatar from '@/assets/images/profile/avtar.webp';
import Buynow from '@/assets/images/backgrounds/sidebarbuynow.svg';
import { useState } from 'react';
import { toast } from 'sonner';
import { logout } from '@/api/system/auth/auth';
import { clearAccessToken } from '@/utils/auth';
import ProfileDialog from '@/components/user-profile';
import AccountSettingsDialog from '@/components/account-settings';

export default function ProfileSheet() {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);

  /**
   * Profile / Account Settings 均为弹窗展示：先收起侧边抽屉，再打开对应 Dialog。
   */
  const handleMenuAction = (action: 'open-profile' | 'open-account-settings') => {
    setSheetOpen(false);
    if (action === 'open-profile') {
      setProfileDialogOpen(true);
    } else {
      setAccountSettingsOpen(true);
    }
  };

  /**
   * 通知服务端当前 Token 失效，并在任何情况下清理本地会话，避免浏览器继续保留登录态。
   */
  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    try {
      setLoggingOut(true);
      const result = await logout();
      if (result.success) {
        toast.success('操作成功', { description: '已退出登录' });
      }
    } catch {
      // 网络异常会由全局请求封装提示；仍应退出本机，避免令牌继续保留在浏览器中。
    } finally {
      clearAccessToken();
      navigate('/auth/auth2/login', { replace: true });
    }
  };

  return (
    <>
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      {/* Trigger Button */}
      <SheetTrigger className="cursor-pointer hover:bg-primary/5 flex items-center justify-center rounded-full h-10 w-10">
        <Avatar className="h-8 w-8">
          <AvatarImage src={avatar} alt="profile" />
          <AvatarFallback>CM</AvatarFallback>
        </Avatar>
      </SheetTrigger>

      {/* Drawer Panel */}
      <SheetContent
        showCloseButton={false}
        side="right"
        className="border-s-0 w-full sm:max-w-80 max-w-60"
      >
        <SheetClose className="absolute top-5 end-5 p-2 hover:bg-primary/5 hover:text-primary rounded-full">
          <Icon icon="tabler:x" width={20} height={20} />
        </SheetClose>
        {/* Top Profile Section */}
        <div className="p-6 py-6">
          <div className="flex flex-col gap-4 justify-center items-center pt-10">
            <Avatar className="h-16 w-16">
              <AvatarImage
                src={avatar}
                alt="Profile"
                width={30}
                height={30}
              />
              <AvatarFallback>CM</AvatarFallback>
            </Avatar>

            <div className="text-center">
              <h6 className="text-lg font-semibold">Cameron</h6>
              <div className="flex items-center gap-2 justify-center">
                <Mailbox
                  size={18} className="text-muted-foreground"
                />
                <span className="text-sm font-normal text-muted-foreground">
                  info@shadcndashboard.com
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Menu List */}
        <div className="border-t  border-border">
          <ul className="flex flex-col gap-2 p-6">
            {profileDD.map((item) => (
              <li key={item.title} className="group">
                {item.action ? (
                  <button
                    type="button"
                    onClick={() => handleMenuAction(item.action!)}
                    className={cn(
                      "w-full cursor-pointer flex gap-3 py-2 px-3 rounded-md group-hover:bg-primary/5 text-muted-foreground"
                    )}
                  >
                    <item.avatar
                      width={20}
                      height={20}
                      className="group-hover:text-primary"
                    />

                    <div className="flex gap-3 items-center">
                      <h6 className="text-sm group-hover:text-primary">
                        {item.title}
                      </h6>
                    </div>
                  </button>
                ) : (
                  <Link
                    to={item.href ?? '/'}
                    className={cn(
                      "flex gap-3 py-2 px-3 rounded-md group-hover:bg-primary/5 text-muted-foreground"
                    )}
                  >
                    <item.avatar
                      width={20}
                      height={20}
                      className="group-hover:text-primary"
                    />

                    <div className="flex gap-3 items-center">
                      <h6 className="text-sm group-hover:text-primary">
                        {item.title}
                      </h6>

                      {item.badge && (
                        <span className="h-5 w-6 text-sm flex justify-center items-center text-primary rounded-sm bg-primary/5">
                          4
                        </span>
                      )}
                    </div>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <SheetFooter className="px-0 pb-6">
          <div className="border-t border-border w-full">
            <div className="rounded-sm pt-6 flex flex-col justify-center items-center gap-3">
              <div>
                <img
                  src={Buynow}
                  alt="login-bg"
                />
              </div>

              <div className="text-center">
                <h5 className="text-xl font-semibold">
                  Grab ShadcnDashboard Admin
                </h5>
                <p className="text-sm text-muted-foreground">
                  Customize your dashboard
                </p>
              </div>

              <Button
                variant="secondary"
                className="text-primary"
                disabled={loggingOut}
                onClick={handleLogout}
              >
                {loggingOut ? '退出中...' : '退出登录'}
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>

    {/* 个人资料弹窗（原 Pages > User Profile 页面） */}
    <ProfileDialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen} />

    {/* 账户设置弹窗（AI 配置 / 应用配置 / 邮箱绑定 / 通知 / 偏好 / 安全） */}
    <AccountSettingsDialog open={accountSettingsOpen} onOpenChange={setAccountSettingsOpen} />
    </>
  );
}

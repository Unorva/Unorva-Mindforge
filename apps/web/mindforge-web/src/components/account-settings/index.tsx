// import { createContext, useContext, useState, type ReactNode } from 'react';
// import { Bot, Check, Palette, UserRound } from 'lucide-react';
// import { toast } from 'sonner';
// import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle,
// } from '@/components/ui/dialog';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Switch } from '@/components/ui/switch';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Textarea } from '@/components/ui/textarea';
// import { useTheme } from '@/context/shadcntheme/ThemeContext';
// import defaultAvatar from '@/assets/images/profile/avtar.webp';
//
// type AccountSettingsContextValue = {
//   openAccountSettings: () => void;
// };
//
// type ProfileDraft = {
//   nickname: string;
//   phone: string;
//   bio: string;
// };
//
// const PROFILE_STORAGE_KEY = 'mindforge_profile_draft';
// const AccountSettingsContext = createContext<AccountSettingsContextValue | null>(null);
//
// function getProfileDraft(): ProfileDraft {
//   const email = getCurrentUserEmail();
//   const fallback: ProfileDraft = {
//     nickname: email?.split('@')[0] ?? '',
//     phone: '',
//     bio: '',
//   };
//
//   try {
//     const savedDraft = localStorage.getItem(PROFILE_STORAGE_KEY);
//     return savedDraft ? { ...fallback, ...JSON.parse(savedDraft) } : fallback;
//   } catch {
//     return fallback;
//   }
// }
//
// /**
//  * 设置弹窗的统一入口。侧边栏和后续的个人菜单都可以通过 Context 打开同一份设置。
//  */
// export function AccountSettingsProvider({ children }: { children: ReactNode }) {
//   const [open, setOpen] = useState(false);
//
//   return (
//     <AccountSettingsContext.Provider value={{ openAccountSettings: () => setOpen(true) }}>
//       {children}
//       <AccountSettingsDialog open={open} onOpenChange={setOpen} />
//     </AccountSettingsContext.Provider>
//   );
// }
//
// /**
//  * 仅供已被 AccountSettingsProvider 包裹的应用布局使用。
//  */
// export function useAccountSettings() {
//   const context = useContext(AccountSettingsContext);
//
//   if (!context) {
//     throw new Error('useAccountSettings must be used within AccountSettingsProvider');
//   }
//
//   return context;
// }
//
// function AccountSettingsDialog({
//   open,
//   onOpenChange,
// }: {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
// }) {
//   const { theme, setTheme } = useTheme();
//   const [profile, setProfile] = useState<ProfileDraft>(getProfileDraft);
//   const [reviewReminder, setReviewReminder] = useState(false);
//   const email = getCurrentUserEmail() ?? '登录后显示账号邮箱';
//   const avatarFallback = profile.nickname.trim().slice(0, 1).toUpperCase() || 'M';
//
//   const saveProfile = () => {
//     // 当前后端尚未提供资料更新接口，先保存在本机，避免页面做出“已同步”的假象。
//     localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
//     toast.success('个人资料已保存到本机');
//   };
//
//   const savePreferences = () => {
//     localStorage.setItem('mindforge_review_reminder', String(reviewReminder));
//     toast.success('偏好设置已保存');
//   };
//
//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent
//         className="max-h-[calc(100vh-2rem)] max-w-none gap-0 overflow-y-auto p-0"
//         style={{
//           width: 'calc(100vw - 2rem)',
//           maxWidth: '56rem',
//         }}
//       >
//         <DialogHeader className="border-b px-6 py-5 pr-14">
//           <DialogTitle className="text-lg">设置</DialogTitle>
//           <DialogDescription>
//             管理你的个人资料、使用偏好，以及即将接入的 AI 工作区配置。
//           </DialogDescription>
//         </DialogHeader>
//
//         <Tabs defaultValue="profile" orientation="vertical" className="flex min-h-[34rem] flex-row gap-0">
//           <TabsList variant="line" className="h-auto w-52 shrink-0 flex-col rounded-none border-r bg-muted/30 p-3">
//             <TabsTrigger value="profile" className="justify-start gap-2 px-3">
//               <UserRound className="size-4" />
//               个人资料
//             </TabsTrigger>
//             <TabsTrigger value="ai" className="justify-start gap-2 px-3">
//               <Bot className="size-4" />
//               AI 工作区
//             </TabsTrigger>
//             <TabsTrigger value="preferences" className="justify-start gap-2 px-3">
//               <Palette className="size-4" />
//               偏好设置
//             </TabsTrigger>
//           </TabsList>
//
//           <TabsContent value="profile" className="m-0 min-w-0 flex-1 p-6">
//             <div className="space-y-6">
//               <div>
//                 <h3 className="font-medium">个人资料</h3>
//                 <p className="mt-1 text-sm text-muted-foreground">
//                   这些信息会用于工作区内的个人展示。
//                 </p>
//               </div>
//
//               <Card size="sm">
//                 <CardContent className="flex items-center gap-4">
//                   <Avatar className="size-14">
//                     <AvatarImage src={defaultAvatar} alt="用户头像" />
//                     <AvatarFallback>{avatarFallback}</AvatarFallback>
//                   </Avatar>
//                   <div className="min-w-0 flex-1">
//                     <p className="font-medium">头像</p>
//                     <p className="mt-1 text-sm text-muted-foreground">
//                       头像上传将在资料同步接口接入后启用。
//                     </p>
//                   </div>
//                   <Button variant="outline" disabled>更换头像</Button>
//                 </CardContent>
//               </Card>
//
//               <div className="grid gap-4 sm:grid-cols-2">
//                 <div className="space-y-2">
//                   <Label htmlFor="settings-nickname">昵称</Label>
//                   <Input
//                     id="settings-nickname"
//                     value={profile.nickname}
//                     onChange={(event) => setProfile((current) => ({ ...current, nickname: event.target.value }))}
//                     placeholder="怎么称呼你"
//                     maxLength={40}
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <Label htmlFor="settings-email">账号邮箱</Label>
//                   <Input id="settings-email" value={email} disabled />
//                 </div>
//                 <div className="space-y-2 sm:col-span-2">
//                   <Label htmlFor="settings-phone">手机号</Label>
//                   <Input
//                     id="settings-phone"
//                     value={profile.phone}
//                     onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))}
//                     placeholder="选填，后续可用于账号安全验证"
//                     maxLength={30}
//                   />
//                 </div>
//                 <div className="space-y-2 sm:col-span-2">
//                   <Label htmlFor="settings-bio">个人简介</Label>
//                   <Textarea
//                     id="settings-bio"
//                     value={profile.bio}
//                     onChange={(event) => setProfile((current) => ({ ...current, bio: event.target.value }))}
//                     placeholder="用一句话介绍自己"
//                     maxLength={160}
//                     className="min-h-24 resize-none"
//                   />
//                 </div>
//               </div>
//
//               <div className="flex justify-end border-t pt-5">
//                 <Button onClick={saveProfile}>
//                   <Check className="size-4" />
//                   保存资料
//                 </Button>
//               </div>
//             </div>
//           </TabsContent>
//
//           <TabsContent value="ai" className="m-0 min-w-0 flex-1 p-6">
//             <div className="space-y-6">
//               <div>
//                 <h3 className="font-medium">AI 工作区</h3>
//                 <p className="mt-1 text-sm text-muted-foreground">
//                   先预留清晰的配置入口，后续接入模型服务时无需改变设置结构。
//                 </p>
//               </div>
//
//               <div className="space-y-3">
//                 {[
//                   ['模型与服务商', '选择模型、服务商以及工作区默认模型。'],
//                   ['回复风格', '配置默认语言、语气和输出偏好。'],
//                   ['知识与隐私', '管理 AI 可读取的知识范围与数据保留规则。'],
//                 ].map(([title, description]) => (
//                   <Card key={title} size="sm">
//                     <CardHeader className="flex-row items-start justify-between gap-3">
//                       <div>
//                         <CardTitle>{title}</CardTitle>
//                         <CardDescription className="mt-1">{description}</CardDescription>
//                       </div>
//                       <Badge variant="secondary">规划中</Badge>
//                     </CardHeader>
//                   </Card>
//                 ))}
//               </div>
//             </div>
//           </TabsContent>
//
//           <TabsContent value="preferences" className="m-0 min-w-0 flex-1 p-6">
//             <div className="space-y-6">
//               <div>
//                 <h3 className="font-medium">偏好设置</h3>
//                 <p className="mt-1 text-sm text-muted-foreground">
//                   这些偏好仅影响当前浏览器中的 Mindforge 使用体验。
//                 </p>
//               </div>
//
//               <div className="space-y-3">
//                 <Card size="sm">
//                   <CardHeader>
//                     <CardTitle>外观</CardTitle>
//                     <CardDescription>选择界面的显示模式。</CardDescription>
//                   </CardHeader>
//                   <CardContent className="flex flex-wrap gap-2">
//                     {(['system', 'light', 'dark'] as const).map((option) => (
//                       <Button
//                         key={option}
//                         variant={theme === option ? 'default' : 'outline'}
//                         size="sm"
//                         onClick={() => setTheme(option)}
//                       >
//                         {{ system: '跟随系统', light: '浅色', dark: '深色' }[option]}
//                       </Button>
//                     ))}
//                   </CardContent>
//                 </Card>
//
//                 <Card size="sm">
//                   <CardContent className="flex items-center justify-between gap-4">
//                     <div>
//                       <p className="font-medium">每日复盘提醒</p>
//                       <p className="mt-1 text-sm text-muted-foreground">在复盘功能接入提醒服务后生效。</p>
//                     </div>
//                     <Switch checked={reviewReminder} onCheckedChange={setReviewReminder} />
//                   </CardContent>
//                 </Card>
//               </div>
//
//               <div className="flex justify-end border-t pt-5">
//                 <Button onClick={savePreferences}>
//                   <Check className="size-4" />
//                   保存偏好
//                 </Button>
//               </div>
//             </div>
//           </TabsContent>
//         </Tabs>
//       </DialogContent>
//     </Dialog>
//   );
// }

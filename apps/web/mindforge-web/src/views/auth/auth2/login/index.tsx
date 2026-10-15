import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import FullLogo from 'src/layouts/full/shared/logo/FullLogo';
import { useState, type SubmitEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { login, register } from '@/api/system/auth/auth';
import { saveAccessToken } from '@/utils/auth';
import { toast } from '@/components/ui/toast';

const BoxedLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // 表单输入状态
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  // 页面交互状态
  const [submitting, setSubmitting] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [nickname, setNickname] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  /**
   * 提交登录表单
   */
  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    // 阻止浏览器提交表单后整页刷新
    event.preventDefault();
    // 防止用户连续点击登录按钮，重复发送请求
    if (submitting) {
      return;
    }
    try {
      setSubmitting(true);
      if (registering) {
        if (password !== confirmPassword) {
          toast.add({ type: 'error', title: '两次输入的密码不一致' });
          return;
        }
        await register({ nickname: nickname.trim(), email: email.trim(), password });
        toast.add({ type: 'success', title: '账户已创建，请登录' });
        setRegistering(false);
        setPassword('');
        setConfirmPassword('');
        return;
      }
      // 页面只调用认证 API，不直接关心 URL、POST 或 JSON 序列化
      const result = await login({
        email: email.trim(),
        password,
        remember,
      });
      // 后端虽可能返回 HTTP 200，但业务仍可能失败，因此继续检查 success
      if (!result.success) {
        return;
      }
      if (!result.data?.token) {
        toast.add({
          type: 'error',
          title: '登录失败',
          description: result.message || '登录失败，请检查邮箱和密码。',
        });
        return;
      }
      // 保存后端签发的 Bearer Token
      saveAccessToken(result.data.token, remember);
      toast.add({ type: 'success', title: '操作成功', description: '登录成功' });
      // 获取路由守卫记录的原访问地址；没有则进入首页
      const from = (location.state as { from?: string } | null)?.from ?? '/';
      // replace 避免用户按返回键回到登录页
      navigate(from, { replace: true });
    } catch {
      // 网络与非 2xx 响应已由全局请求封装提示。
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-accent  px-4">
        <Card className="w-full max-w-md border-none shadow-lg p-6">
          {/* Logo */}
          <div className="mx-auto  w-fit">
            <FullLogo />
          </div>
          <h1 className="text-center text-xl font-semibold">
            {registering ? '创建个人工作台' : '登录个人工作台'}
          </h1>
          <form className="space-y-6 w-full" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {registering && (
                <div className="space-y-1.5">
                  <Label htmlFor="nickname">昵称</Label>
                  <Input
                    id="nickname"
                    required
                    maxLength={100}
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                    placeholder="输入你的昵称"
                    autoComplete="nickname"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-normal text-muted-foreground">
                  邮箱*
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="输入你的邮箱"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-normal text-muted-foreground">
                  密码*
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  minLength={registering ? 8 : undefined}
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="输入你的密码"
                  autoComplete={registering ? 'new-password' : 'current-password'}
                  required
                />
              </div>
              <div className="flex items-center justify-between text-sm flex-wrap gap-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="remember"
                    checked={remember}
                    onCheckedChange={(checked) => setRemember(checked)}
                    className="cursor-pointer"
                  />
                  <Label
                    htmlFor="remember"
                    className="text-muted-foreground font-normal cursor-pointer leading-0"
                  >
                    记住这个设备
                  </Label>
                </div>
              </div>
              {registering && (
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">确认密码（8–128 位）</Label>
                  <Input
                    id="confirm-password"
                    required
                    type="password"
                    minLength={8}
                    maxLength={128}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              )}
            </div>
            <Button type="submit" size="lg" className="w-full rounded-lg" disabled={submitting}>
              {submitting ? '提交中...' : registering ? '创建账户' : '登录'}
            </Button>
            <Button
              type="button"
              disabled={submitting}
              variant="ghost"
              className="w-full"
              onClick={() => {
                setRegistering(!registering);
                setPassword('');
                setConfirmPassword('');
              }}
            >
              {registering ? '已有账户，返回登录' : '没有账户，立即注册'}
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
};

export default BoxedLogin;

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import FullLogo from 'src/layouts/full/shared/logo/FullLogo';
import SocialButtons from '../../authforms/social-buttons';
import { useState, type SubmitEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { login } from '@/api/system/auth/auth';
import { saveAccessToken } from '@/utils/auth';
import { toast } from 'sonner';

const BoxedLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // 表单输入状态
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  // 页面交互状态
  const [submitting, setSubmitting] = useState(false);

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
      // 页面只调用认证 API，不直接关心 URL、POST 或 JSON 序列化
      const result = await login({
        email: email.trim(),
        password,
        remember,
      });
      // 后端虽可能返回 HTTP 200，但业务仍可能失败，因此继续检查 success
      if (!result.success || !result.data?.token) {
        toast.error(result.message || '登录失败，请检查邮箱和密码。');
        return;
      }
      // 保存后端签发的 Bearer Token
      saveAccessToken(result.data.token, remember);
      toast.success('登录成功');
      // 获取路由守卫记录的原访问地址；没有则进入首页
      const from = (location.state as { from?: string } | null)?.from ?? '/';
      // replace 避免用户按返回键回到登录页
      navigate(from, { replace: true });
    } catch {
      // 例如网络不可用、后端返回非 2xx 状态码
      toast.error('登录请求失败，请检查网络或稍后重试。');
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
          <SocialButtons />
          <form className="space-y-6 w-full" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-sm font-normal text-muted-foreground"
                >
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
                <Label
                  htmlFor="password"
                  className="text-sm font-normal text-muted-foreground"
                >
                  密码*
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="输入你的密码"
                  autoComplete="current-password"
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
                <Link
                  to="/auth/auth2/forgot-password"
                  className="text-sm font-medium hover:underline underline-offset-4 transition-all"
                >
                  忘记密码?
                </Link>
              </div>
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full rounded-lg"
              disabled={submitting}
            >
              {submitting ? '登录中...' : '登录'}
            </Button>
          </form>
          {/* Footer */}
          <div className="flex gap-2 text-base font-medium mt-4 items-center justify-center">
            <p className="text-muted-foreground">还没有账号 ?</p>
            <Link
              to={'/auth/auth2/register'}
              className="text-primary/80 hover:text-primary text-sm font-medium"
            >
              创建账户
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
};

export default BoxedLogin;

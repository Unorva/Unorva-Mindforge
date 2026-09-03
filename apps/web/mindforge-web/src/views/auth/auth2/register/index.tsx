import { Card } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import FullLogo from 'src/layouts/full/shared/logo/FullLogo';
import SocialButtons from '../../authforms/social-buttons';
import { useState, type SubmitEvent } from 'react';
import { register } from '@/api/system/auth/auth';
import { toast } from '@/components/ui/toast';

const BoxedRegister = () => {
  const navigate = useNavigate();
  // 表单输入状态；重复密码仅用于页面校验，不会提交给后端。
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // 请求进行中禁用提交按钮，避免用户重复注册。
  const [submitting, setSubmitting] = useState(false);

  /** 提交注册表单，并在成功后引导用户登录。 */
  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    // 阻止浏览器默认提交，以免页面刷新。
    event.preventDefault();

    if (submitting) {
      return;
    }

    if (password !== confirmPassword) {
      toast.add({
        description: '两次输入的密码不一致。',
        priority: 'high',
        title: '注册失败',
        type: 'error',
      });
      return;
    }

    try {
      setSubmitting(true);
      const result = await register({
        nickname: nickname.trim(),
        email: email.trim(),
        password,
      });

      // HTTP 成功不代表业务成功，仍需检查统一响应体的 success。
      if (!result.success) {
        return;
      }

      toast.add({
        description: '注册成功，请登录。',
        title: '操作成功',
        type: 'success',
      });
      // 注册后不保留注册页的历史记录，避免返回后重复提交。
      navigate('/auth/auth2/login', { replace: true });
    } catch {
      // 网络与非 2xx 响应已由全局请求封装提示。
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="relative overflow-hidden h-screen bg-muted">
        <div className="flex h-full justify-center items-center px-4">
          <Card className="md:w-112.5 w-full border-none shadow-lg p-6">
            <div className="mx-auto  w-fit">
              <FullLogo />
            </div>

            <SocialButtons />

            <form className="space-y-6 w-full" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="nickname"
                    className="text-sm font-normal text-muted-foreground"
                  >
                    用户名*
                  </Label>
                  <Input
                    id="nickname"
                    name="nickname"
                    type="text"
                    placeholder="输入你的用户名"
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                    autoComplete="nickname"
                    required
                  />
                </div>
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
                    placeholder="输入你的邮箱"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
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
                    placeholder="输入你的密码"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-sm font-normal text-muted-foreground"
                  >
                    重复密码*
                  </Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="再次输入密码"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full rounded-lg"
                disabled={submitting}
              >
                {submitting ? '注册中...' : '注册'}
              </Button>
            </form>
            <div className="flex gap-2 text-base text-muted-foreground font-medium mt-4 items-center justify-center">
              <p>已有账号?</p>
              <Link
                to={'/auth/auth2/login'}
                className="text-primary/80 text-base hover:text-primary font-medium"
              >
                去登录
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
};

export default BoxedRegister;

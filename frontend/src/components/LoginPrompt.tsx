import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles } from 'lucide-react';

export default function LoginPrompt() {
  const { login, loginStatus } = useInternetIdentity();
  const disabled = loginStatus === 'logging-in';

  return (
    <div className="container py-16">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-2xl" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60">
              <Lock className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>
        </div>

        <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
          欢迎来到JiDian吉店
        </h2>
        <p className="mb-2 text-xl font-medium text-primary">
          点滴资助，步步解锁
        </p>
        <p className="mb-8 text-lg text-muted-foreground">
          发布您的虚拟文本作品，根据收到的付款渐进式解锁内容。
          <br />
          登录后即可浏览所有作品并发布您自己的内容。
        </p>

        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button
            onClick={login}
            disabled={disabled}
            size="lg"
            className="gap-2"
          >
            <Sparkles className="h-5 w-5" />
            {disabled ? '登录中...' : '立即登录'}
          </Button>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-2 text-3xl">📝</div>
            <h3 className="mb-2 font-semibold">发布内容</h3>
            <p className="text-sm text-muted-foreground">
              创建文本作品，设置免费和付费内容
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-2 text-3xl">🔓</div>
            <h3 className="mb-2 font-semibold">渐进解锁</h3>
            <p className="text-sm text-muted-foreground">
              根据收款进度自动解锁付费内容
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-2 text-3xl">💰</div>
            <h3 className="mb-2 font-semibold">实时更新</h3>
            <p className="text-sm text-muted-foreground">
              每30秒自动刷新收款状态
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

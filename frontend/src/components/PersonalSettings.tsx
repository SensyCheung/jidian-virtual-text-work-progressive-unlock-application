import { useState, useEffect } from 'react';
import { useGetCallerUserProfile, useSaveCallerUserProfile } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, CheckCircle2, User } from 'lucide-react';
import { toast } from 'sonner';
import { Principal } from '@icp-sdk/core/principal';

export default function PersonalSettings() {
  const { data: userProfile, isLoading } = useGetCallerUserProfile();
  const saveProfile = useSaveCallerUserProfile();
  const { identity } = useInternetIdentity();

  const [name, setName] = useState('');
  const [principalAddress, setPrincipalAddress] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setPrincipalAddress(userProfile.principalAddress?.toString() || '');
    }
  }, [userProfile]);

  useEffect(() => {
    if (userProfile) {
      const nameChanged = name !== (userProfile.name || '');
      const principalChanged = principalAddress !== (userProfile.principalAddress?.toString() || '');
      setHasChanges(nameChanged || principalChanged);
    }
  }, [name, principalAddress, userProfile]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('请输入显示名称');
      return;
    }

    try {
      let principal: Principal | undefined;
      
      if (principalAddress.trim()) {
        try {
          principal = Principal.fromText(principalAddress.trim());
        } catch (error) {
          toast.error('Principal 地址格式无效');
          return;
        }
      }

      await saveProfile.mutateAsync({
        name: name.trim(),
        principalAddress: principal,
        createdAt: userProfile?.createdAt || BigInt(Date.now() * 1_000_000),
        updatedAt: BigInt(Date.now() * 1_000_000),
      });

      toast.success('个人资料已保存');
      setHasChanges(false);
    } catch (error) {
      toast.error('保存失败，请重试');
      console.error('Save profile error:', error);
    }
  };

  const handleCancel = () => {
    if (userProfile) {
      setName(userProfile.name || '');
      setPrincipalAddress(userProfile.principalAddress?.toString() || '');
      setHasChanges(false);
    }
  };

  const copyCurrentPrincipal = () => {
    if (identity) {
      const principal = identity.getPrincipal().toString();
      navigator.clipboard.writeText(principal);
      toast.success('当前登录 Principal 已复制');
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8 max-w-2xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-2xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">个人设置</h1>
          <p className="text-muted-foreground">管理您的个人资料和账户信息</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>个人资料</CardTitle>
            <CardDescription>更新您的显示名称和 Principal 地址</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">显示名称 *</Label>
              <Input
                id="name"
                placeholder="输入您的显示名称"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saveProfile.isPending}
              />
              <p className="text-xs text-muted-foreground">
                此名称将在您创建的作品中显示
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="principal">Principal 地址（可选）</Label>
              <Input
                id="principal"
                placeholder="输入 Principal 地址"
                value={principalAddress}
                onChange={(e) => setPrincipalAddress(e.target.value)}
                className="font-mono text-sm"
                disabled={saveProfile.isPending}
              />
              <p className="text-xs text-muted-foreground">
                用于查询账户 ID 的累计收款金额
              </p>
            </div>

            {hasChanges && (
              <Alert>
                <AlertDescription className="text-sm">
                  您有未保存的更改
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saveProfile.isPending}
                className="flex-1"
              >
                {saveProfile.isPending ? '保存中...' : '保存更改'}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={!hasChanges || saveProfile.isPending}
                className="flex-1"
              >
                取消
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>当前登录身份</CardTitle>
            <CardDescription>您当前使用的 Internet Identity Principal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {identity ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Principal ID:</span>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 rounded-md border bg-muted/50 px-3 py-2 text-sm font-mono break-all">
                    {identity.getPrincipal().toString()}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyCurrentPrincipal}
                    className="shrink-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    已通过 Internet Identity 认证
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <Alert>
                <AlertDescription className="text-sm">
                  未登录
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useSaveCallerUserProfile } from '../hooks/useQueries';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ProfileSetupModal() {
  const [name, setName] = useState('');
  const saveProfile = useSaveCallerUserProfile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('请输入您的名称');
      return;
    }

    try {
      await saveProfile.mutateAsync({ 
        name: name.trim(), 
        principalAddress: undefined,
        createdAt: BigInt(Date.now() * 1_000_000),
        updatedAt: BigInt(Date.now() * 1_000_000),
      });
      toast.success('个人资料已保存');
    } catch (error) {
      toast.error('保存失败，请重试');
      console.error('Profile setup error:', error);
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>设置个人资料</DialogTitle>
          <DialogDescription>
            首次登录需要设置您的显示名称
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">显示名称 *</Label>
            <Input
              id="name"
              placeholder="输入您的名称"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              disabled={saveProfile.isPending}
            />
            <p className="text-xs text-muted-foreground">
              此名称将在您创建的作品中显示
            </p>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={saveProfile.isPending || !name.trim()}
          >
            {saveProfile.isPending ? '保存中...' : '保存'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

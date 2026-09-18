import { useGetAllWorksAdmin, useDeleteProduct, useIsCallerAdmin, useGetSettings, useUpdateSettings, useGetAnalyticsSettings, useUpdateAnalyticsSettings } from '../hooks/useQueries';
import { useNavigate } from '@tanstack/react-router';
import { useLanguage } from '../contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Trash2, Eye, RefreshCw, Shield, Settings, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import type { Work } from '../backend';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsCallerAdmin();
  const { data: works, isLoading, refetch, isFetching } = useGetAllWorksAdmin();
  const { data: settings, isLoading: settingsLoading } = useGetSettings();
  const { data: analyticsSettings, isLoading: analyticsLoading } = useGetAnalyticsSettings();
  const updateSettings = useUpdateSettings();
  const updateAnalytics = useUpdateAnalyticsSettings();
  const deleteProductMutation = useDeleteProduct();
  const [workToDelete, setWorkToDelete] = useState<Work | null>(null);
  const [allowAnonymousPublishing, setAllowAnonymousPublishing] = useState(true);
  const [gaTrackingId, setGaTrackingId] = useState('');
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  // Sync local state with fetched settings
  useEffect(() => {
    if (settings) {
      setAllowAnonymousPublishing(settings.allowAnonymousPublishing);
    }
  }, [settings]);

  // Sync local state with fetched analytics settings
  useEffect(() => {
    if (analyticsSettings) {
      setGaTrackingId(analyticsSettings.gaTrackingId || '');
      setAnalyticsEnabled(analyticsSettings.analyticsEnabled);
    }
  }, [analyticsSettings]);

  // Check admin access
  useEffect(() => {
    if (!isAdminLoading && !isAdmin) {
      toast.error(t.admin.accessDenied, {
        description: t.admin.accessDeniedDesc,
      });
      navigate({ to: '/' });
    }
  }, [isAdmin, isAdminLoading, navigate, t]);

  const handleDelete = async () => {
    if (!workToDelete) return;

    try {
      await deleteProductMutation.mutateAsync(workToDelete.id);
      toast.success(t.admin.workDeleted, {
        description: `${t.admin.workDeletedDesc}`,
      });
      setWorkToDelete(null);
    } catch (error: any) {
      toast.error(t.admin.deleteError, {
        description: t.admin.deleteErrorDesc,
      });
    }
  };

  const handleSettingsChange = async (newValue: boolean) => {
    setAllowAnonymousPublishing(newValue);
    
    try {
      await updateSettings.mutateAsync({
        allowAnonymousPublishing: newValue,
        gaTrackingId: gaTrackingId || undefined,
        analyticsEnabled,
      });
      toast.success(t.admin.settingsSaved);
    } catch (error) {
      toast.error(t.admin.settingsError);
      // Revert on error
      setAllowAnonymousPublishing(!newValue);
    }
  };

  const handleAnalyticsToggle = async (newValue: boolean) => {
    setAnalyticsEnabled(newValue);
    
    try {
      await updateAnalytics.mutateAsync({
        gaTrackingId: gaTrackingId || undefined,
        analyticsEnabled: newValue,
      });
      toast.success(t.admin.settingsSaved);
      
      // Reload page to apply GA script changes
      if (newValue !== analyticsSettings?.analyticsEnabled) {
        setTimeout(() => window.location.reload(), 500);
      }
    } catch (error) {
      toast.error(t.admin.settingsError);
      // Revert on error
      setAnalyticsEnabled(!newValue);
    }
  };

  const handleAnalyticsSave = async () => {
    // Validate tracking ID format if provided
    if (gaTrackingId && !/^G-[A-Z0-9]{10}$/i.test(gaTrackingId)) {
      toast.error(t.admin.gaInvalidFormat);
      return;
    }

    try {
      await updateAnalytics.mutateAsync({
        gaTrackingId: gaTrackingId || undefined,
        analyticsEnabled,
      });
      toast.success(t.admin.settingsSaved);
      
      // Reload page to apply GA script changes
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      toast.error(t.admin.settingsError);
    }
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatICP = (amount: bigint) => {
    return (Number(amount) / 1e8).toFixed(4);
  };

  // Sort works by publication date (newest to oldest)
  const sortedWorks = works?.slice().sort((a, b) => {
    return Number(b.publishedAt) - Number(a.publishedAt);
  });

  // Display anonymous user label
  const getAuthorDisplay = (work: Work) => {
    if (!work.author || work.author === '' || work.author === 'Anonymous User') {
      return t.common.anonymousUser;
    }
    return work.author;
  };

  // Count only valid works
  const activeWorksCount = works?.filter(w => !w.deleted).length || 0;
  const deletedWorksCount = works?.filter(w => w.deleted).length || 0;
  const totalWorksCount = works?.length || 0;

  if (isAdminLoading || isLoading || settingsLoading || analyticsLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground">{t.admin.loading}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">{t.admin.pageTitle}</h1>
            <p className="text-muted-foreground">{t.admin.description}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t.admin.totalWorks}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalWorksCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t.admin.activeWorks}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {activeWorksCount}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t.admin.deletedWorks}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {deletedWorksCount}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <CardTitle>{t.admin.settingsTitle}</CardTitle>
            </div>
            <CardDescription>
              {t.admin.settingsDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="anonymous-publishing" className="text-base font-medium">
                  {t.admin.anonymousPublishingTitle}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t.admin.anonymousPublishingDesc}
                </p>
              </div>
              <Switch
                id="anonymous-publishing"
                checked={allowAnonymousPublishing}
                onCheckedChange={handleSettingsChange}
                disabled={updateSettings.isPending}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <CardTitle>{t.admin.gaSettingsTitle}</CardTitle>
            </div>
            <CardDescription>
              {t.admin.gaSettingsDesc}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ga-tracking-id">{t.admin.gaTrackingIdLabel}</Label>
              <Input
                id="ga-tracking-id"
                placeholder={t.admin.gaTrackingIdPlaceholder}
                value={gaTrackingId}
                onChange={(e) => setGaTrackingId(e.target.value)}
                disabled={updateAnalytics.isPending}
              />
              <p className="text-sm text-muted-foreground">
                {t.admin.gaTrackingIdDesc}
              </p>
            </div>
            
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="analytics-enabled" className="text-base font-medium">
                  {t.admin.gaEnabledLabel}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t.admin.gaEnabledDesc}
                </p>
              </div>
              <Switch
                id="analytics-enabled"
                checked={analyticsEnabled}
                onCheckedChange={handleAnalyticsToggle}
                disabled={updateAnalytics.isPending}
              />
            </div>

            <Button
              onClick={handleAnalyticsSave}
              disabled={updateAnalytics.isPending}
              className="w-full"
            >
              {updateAnalytics.isPending ? t.common.loading : t.common.save}
            </Button>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t.admin.debugConsole}</CardTitle>
            <CardDescription>
              {t.admin.debugConsoleDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t.admin.debugConsoleNote}
            </p>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{t.admin.allWorks}</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            {t.admin.refresh}
          </Button>
        </div>
      </div>

      {!sortedWorks || sortedWorks.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-[300px] items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-medium text-muted-foreground">{t.admin.noWorks}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.admin.status}</TableHead>
                    <TableHead>{t.admin.workTitle}</TableHead>
                    <TableHead>{t.admin.author}</TableHead>
                    <TableHead>{t.admin.targetAmount}</TableHead>
                    <TableHead>{t.admin.publishedAt}</TableHead>
                    <TableHead className="text-right">{t.admin.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedWorks.map((work) => (
                    <TableRow key={work.id}>
                      <TableCell>
                        {work.deleted ? (
                          <Badge variant="destructive">{t.admin.statusDeleted}</Badge>
                        ) : (
                          <Badge variant="default">{t.admin.statusActive}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium max-w-xs truncate">
                        {work.title}
                      </TableCell>
                      <TableCell className="font-medium">{getAuthorDisplay(work)}</TableCell>
                      <TableCell>{formatICP(work.targetAmount)} ICP</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(work.publishedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate({ to: '/article/$id', params: { id: work.id } })}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            {t.admin.view}
                          </Button>
                          {!work.deleted && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setWorkToDelete(work)}
                              className="gap-2 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              {t.admin.delete}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!workToDelete} onOpenChange={(open) => !open && setWorkToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.confirmDelete}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.admin.confirmDeleteDesc} "{workToDelete?.title}"?
              <br />
              <br />
              {t.admin.confirmDeleteNote}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.admin.cancelButton}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.admin.confirmButton}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


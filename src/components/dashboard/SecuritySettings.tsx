import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Shield, Trash2, Clock, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const SecuritySettings = () => {
  const [autoPurgeEnabled, setAutoPurgeEnabled] = useState(true);
  const [retentionDays, setRetentionDays] = useState('30');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { session } = useAuth();

  const handleUpdateSettings = async () => {
    if (!session) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          auto_purge_enabled: autoPurgeEnabled,
          email_retention_days: parseInt(retentionDays)
        })
        .eq('user_id', session.user.id);

      if (error) throw error;

      toast({
        title: 'Settings updated',
        description: 'Your security settings have been saved.',
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePurgeExpired = async () => {
    if (!session) return;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('email-purge', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { userId: session.user.id }
      });

      if (error) throw error;

      toast({
        title: 'Expired content purged',
        description: 'All expired email content has been permanently deleted.',
      });
    } catch (error) {
      console.error('Error purging expired content:', error);
      toast({
        title: 'Error',
        description: 'Failed to purge expired content. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectAndPurge = async () => {
    if (!session) return;

    setLoading(true);
    try {
      // Complete data purge
      const { error: purgeError } = await supabase.functions.invoke('email-purge', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { purgeAll: true }
      });

      if (purgeError) throw purgeError;

      // Sign out user
      await supabase.auth.signOut();

      toast({
        title: 'Account disconnected',
        description: 'All your email data has been permanently deleted and you have been signed out.',
      });
    } catch (error) {
      console.error('Error disconnecting and purging:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete disconnection. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Security & Privacy</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Email Content Retention
          </CardTitle>
          <CardDescription>
            Control how long encrypted email content is stored in our system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-purge">Automatic purge expired content</Label>
            <Switch
              id="auto-purge"
              checked={autoPurgeEnabled}
              onCheckedChange={setAutoPurgeEnabled}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="retention-days">Retention period</Label>
            <Select value={retentionDays} onValueChange={setRetentionDays}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleUpdateSettings} disabled={loading}>
            Save Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data Management
          </CardTitle>
          <CardDescription>
            Manage your stored email data and privacy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={handlePurgeExpired}
              disabled={loading}
              className="w-full justify-start"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Purge Expired Content Now
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={loading}
                  className="w-full justify-start"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Disconnect & Delete All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will permanently delete all your email data, conversations, 
                    and analysis results. You will also be signed out of your account. 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDisconnectAndPurge}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Everything & Sign Out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Security features:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>All email content is encrypted before storage</li>
              <li>Analysis uses encrypted data in memory only</li>
              <li>Automatic content expiration based on your settings</li>
              <li>No plaintext email storage</li>
              <li>Full audit logging of data access</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
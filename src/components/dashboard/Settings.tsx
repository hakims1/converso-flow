import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Mail, Bell, Shield, CreditCard, User, Trash2 } from "lucide-react";
import { SecuritySettings } from './SecuritySettings';
import DataCleanup from './DataCleanup';

export function DashboardSettings() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account preferences and integrations.
          </p>
        </div>
      </div>

      {/* Account Section */}
      <Card className="gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            Account Settings
          </CardTitle>
          <CardDescription>
            Manage your profile and account preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" placeholder="your.email@example.com" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="Your Name" disabled />
            </div>
          </div>
          <Button variant="outline" disabled>
            Update Profile
          </Button>
        </CardContent>
      </Card>

      {/* Gmail Integration */}
      <Card className="gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="mr-2 h-5 w-5" />
            Gmail Integration
          </CardTitle>
          <CardDescription>
            Manage your Gmail connection and sync preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Gmail Account</div>
              <div className="text-sm text-muted-foreground">Not connected</div>
            </div>
            <Button className="gradient-primary text-white border-0">
              Connect Gmail
            </Button>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-sync new emails</Label>
                <div className="text-sm text-muted-foreground">
                  Automatically analyze new conversations
                </div>
              </div>
              <Switch disabled />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include sent emails</Label>
                <div className="text-sm text-muted-foreground">
                  Analyze your outgoing messages too
                </div>
              </div>
              <Switch disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card className="gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="mr-2 h-5 w-5" />
            Subscription
          </CardTitle>
          <CardDescription>
            Manage your billing and subscription details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Current Plan</div>
              <div className="text-sm text-muted-foreground">Free tier - 10 conversations</div>
            </div>
            <Badge variant="secondary" className="bg-primary-light/10 text-primary-light">
              Free
            </Badge>
          </div>
          
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">Pro Plan</div>
                <div className="text-2xl font-bold text-primary-light">$29<span className="text-sm font-normal">/mo</span></div>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                <li>• Unlimited conversation analysis</li>
                <li>• Advanced analytics dashboard</li>
                <li>• Custom action item management</li>
                <li>• Priority customer support</li>
              </ul>
              <Button className="w-full gradient-primary text-white border-0">
                Upgrade to Pro
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Configure how you want to be notified
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email notifications</Label>
                <div className="text-sm text-muted-foreground">
                  Receive updates about new insights
                </div>
              </div>
              <Switch disabled />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Action item reminders</Label>
                <div className="text-sm text-muted-foreground">
                  Get notified about pending tasks
                </div>
              </div>
              <Switch disabled />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Weekly analytics digest</Label>
                <div className="text-sm text-muted-foreground">
                  Summary of your email patterns
                </div>
              </div>
              <Switch disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Security */}
      <Card className="gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            Privacy & Security
          </CardTitle>
          <CardDescription>
            Control your data and privacy settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Data retention</Label>
                <div className="text-sm text-muted-foreground">
                  Keep analysis data for improved insights
                </div>
              </div>
              <Switch disabled />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Analytics sharing</Label>
                <div className="text-sm text-muted-foreground">
                  Help improve our AI with anonymized data
                </div>
              </div>
              <Switch disabled />
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <Button variant="outline" disabled>
              Download My Data
            </Button>
            <Button variant="destructive" disabled>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Security Cleanup */}
      <DataCleanup />

      <SecuritySettings />
    </div>
  );
}
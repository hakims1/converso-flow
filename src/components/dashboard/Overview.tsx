import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, CheckSquare, TrendingUp, Clock, Zap } from "lucide-react";

export function Overview() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your emails.
          </p>
        </div>
        <Button className="gradient-primary text-white border-0">
          <Mail className="mr-2 h-4 w-4" />
          Connect Gmail
        </Button>
      </div>

      {/* Status Card */}
      <Card className="gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="mr-2 h-5 w-5 text-primary-light" />
            Get Started with Your Email Analysis
          </CardTitle>
          <CardDescription>
            Connect your Gmail account to unlock powerful AI insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-primary-light/10 text-primary-light">
              Free Plan
            </Badge>
            <span className="text-sm text-muted-foreground">10 conversations available</span>
          </div>
          <Button className="gradient-primary text-white border-0">
            Connect Gmail Account
          </Button>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Conversations
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-light">0</div>
            <p className="text-xs text-muted-foreground">
              Connect Gmail to see your conversations
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Action Items
            </CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-light">0</div>
            <p className="text-xs text-muted-foreground">
              AI will suggest action items
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Response Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-light">--</div>
            <p className="text-xs text-muted-foreground">
              Analysis will show insights
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Response Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-light">--%</div>
            <p className="text-xs text-muted-foreground">
              Track your email effectiveness
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks to get you started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start" disabled>
              <Mail className="mr-2 h-4 w-4" />
              Analyze Recent Conversations
            </Button>
            <Button variant="outline" className="w-full justify-start" disabled>
              <CheckSquare className="mr-2 h-4 w-4" />
              View Action Items
            </Button>
            <Button variant="outline" className="w-full justify-start" disabled>
              <TrendingUp className="mr-2 h-4 w-4" />
              Check Analytics
            </Button>
            <p className="text-xs text-muted-foreground">
              Connect Gmail to enable these features
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle>Upgrade Benefits</CardTitle>
            <CardDescription>
              Unlock the full power of AI email insights
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <CheckSquare className="mr-2 h-4 w-4 text-primary-light" />
                Analyze unlimited conversations
              </li>
              <li className="flex items-center">
                <CheckSquare className="mr-2 h-4 w-4 text-primary-light" />
                Advanced analytics dashboard
              </li>
              <li className="flex items-center">
                <CheckSquare className="mr-2 h-4 w-4 text-primary-light" />
                Custom action item management
              </li>
              <li className="flex items-center">
                <CheckSquare className="mr-2 h-4 w-4 text-primary-light" />
                Topic-based conversation filtering
              </li>
            </ul>
            <Button className="w-full gradient-primary text-white border-0">
              Upgrade to Pro - $29/month
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
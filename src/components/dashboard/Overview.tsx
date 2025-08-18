import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, CheckSquare, TrendingUp, Clock, Zap } from "lucide-react";
import { ConversationsDashboard } from "@/components/ConversationsDashboard";

export function Overview() {
  return (
    <div className="space-y-6">
      {/* Conversations Dashboard */}
      <ConversationsDashboard />

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
            <div className="text-2xl font-bold text-primary-light">6</div>
            <p className="text-xs text-muted-foreground">
              Conversations analyzed this month
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
            <div className="text-2xl font-bold text-primary-light">3</div>
            <p className="text-xs text-muted-foreground">
              Follow-ups needed
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
            <div className="text-2xl font-bold text-primary-light">2.3d</div>
            <p className="text-xs text-muted-foreground">
              Average response time
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
            <div className="text-2xl font-bold text-primary-light">85%</div>
            <p className="text-xs text-muted-foreground">
              Response rate this month
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
              Common tasks to manage your conversations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start">
              <Mail className="mr-2 h-4 w-4" />
              View All Conversations
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <CheckSquare className="mr-2 h-4 w-4" />
              Review Action Items
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <TrendingUp className="mr-2 h-4 w-4" />
              View Analytics
            </Button>
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
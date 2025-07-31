import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, Clock, MessageSquare, Users, Target } from "lucide-react";

export function Analytics() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Discover patterns and insights in your email communications.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select disabled>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" disabled>
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-light">--%</div>
            <p className="text-xs text-muted-foreground">
              Connect Gmail for insights
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-light">--h</div>
            <p className="text-xs text-muted-foreground">
              Time to first response
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-light">0</div>
            <p className="text-xs text-muted-foreground">
              Email threads analyzed
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-light">0</div>
            <p className="text-xs text-muted-foreground">
              People you've emailed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle>Conversation Trends</CardTitle>
            <CardDescription>
              Email volume over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="mx-auto h-12 w-12 mb-4" />
                <p>Connect Gmail to see conversation trends</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle>Response Times</CardTitle>
            <CardDescription>
              Optimal sending times analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Clock className="mx-auto h-12 w-12 mb-4" />
                <p>Response time analysis will appear here</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversation Categories */}
      <Card className="gradient-card shadow-card">
        <CardHeader>
          <CardTitle>Conversation Categories</CardTitle>
          <CardDescription>
            Break down your emails by type and topic
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "Sales", count: 0, color: "bg-primary-light" },
              { name: "Support", count: 0, color: "bg-primary-lighter" },
              { name: "Internal", count: 0, color: "bg-secondary" }
            ].map((category) => (
              <div key={category.name} className="text-center p-6 border rounded-lg">
                <div className={`w-16 h-16 rounded-full ${category.color} mx-auto mb-4 flex items-center justify-center`}>
                  <Target className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-semibold text-lg">{category.name}</h3>
                <p className="text-2xl font-bold text-primary-light">{category.count}</p>
                <p className="text-sm text-muted-foreground">conversations</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Topics Analysis */}
      <Card className="gradient-card shadow-card">
        <CardHeader>
          <CardTitle>Most Discussed Topics</CardTitle>
          <CardDescription>
            Trending topics in your conversations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Topic Analysis Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Connect your Gmail account to see which topics come up most frequently in your conversations.
            </p>
            <div className="flex flex-wrap justify-center gap-2 opacity-50">
              {["Pricing", "Features", "Demo", "Support", "Integration", "Timeline"].map((topic) => (
                <Badge key={topic} variant="outline">{topic}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
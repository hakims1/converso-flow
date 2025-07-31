import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Search, Filter, MessageSquare, Calendar, User } from "lucide-react";

export function Conversations() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conversations</h1>
          <p className="text-muted-foreground">
            View and analyze your email conversations with AI insights.
          </p>
        </div>
        <Button className="gradient-primary text-white border-0">
          <MessageSquare className="mr-2 h-4 w-4" />
          Analyze Conversations
        </Button>
      </div>

      {/* Filters */}
      <Card className="gradient-card shadow-card">
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
          <CardDescription>
            Find specific conversations quickly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search conversations..." 
                className="pl-9"
                disabled
              />
            </div>
            <Select disabled>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
              </SelectContent>
            </Select>
            <Select disabled>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Select disabled>
              <SelectTrigger>
                <SelectValue placeholder="Topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                <SelectItem value="pricing">Pricing</SelectItem>
                <SelectItem value="features">Features</SelectItem>
                <SelectItem value="support">Support</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Conversations List */}
      <Card className="gradient-card shadow-card">
        <CardHeader>
          <CardTitle>Recent Conversations</CardTitle>
          <CardDescription>
            Your most recent email conversations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Conversations Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Connect your Gmail account to see your conversations here. 
              We'll analyze your recent emails and provide AI-powered insights.
            </p>
            <Button className="gradient-primary text-white border-0">
              <Mail className="mr-2 h-4 w-4" />
              Connect Gmail Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sample Conversation Preview (for demo) */}
      <Card className="gradient-card shadow-card opacity-50">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Preview: What you'll see</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <User className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Sample Contact {i}</div>
                      <div className="text-sm text-muted-foreground">contact{i}@example.com</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">Sales</Badge>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">2 days ago</span>
                  </div>
                </div>
                <div className="text-sm">
                  <div className="font-medium mb-1">Subject: Product Demo Request</div>
                  <div className="text-muted-foreground">
                    Hi, I'm interested in learning more about your product features and pricing...
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span>3 messages</span>
                  <span>•</span>
                  <span>Avg response: 2h 15m</span>
                  <span>•</span>
                  <span>2 action items detected</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
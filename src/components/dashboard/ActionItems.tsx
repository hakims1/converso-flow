import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, CheckSquare, Clock, AlertCircle, User, Calendar } from "lucide-react";

export function ActionItems() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Action Items</h1>
          <p className="text-muted-foreground">
            Manage AI-suggested and custom action items from your conversations.
          </p>
        </div>
        <Button className="gradient-primary text-white border-0" disabled>
          <Plus className="mr-2 h-4 w-4" />
          Add Action Item
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-light">0</div>
            <p className="text-xs text-muted-foreground">
              No action items yet
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-light">0</div>
            <p className="text-xs text-muted-foreground">
              Tasks to complete
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-light">0</div>
            <p className="text-xs text-muted-foreground">
              Past due items
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-light">0</div>
            <p className="text-xs text-muted-foreground">
              Tasks finished
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Items List */}
      <Card className="gradient-card shadow-card">
        <CardHeader>
          <CardTitle>Your Action Items</CardTitle>
          <CardDescription>
            AI-suggested and custom tasks from your email conversations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Action Items Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Once you connect Gmail and analyze conversations, AI will suggest action items. 
              You can also create custom tasks manually.
            </p>
            <Button className="gradient-primary text-white border-0">
              Connect Gmail to Get Started
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sample Action Items Preview (for demo) */}
      <Card className="gradient-card shadow-card opacity-50">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Preview: What you'll see</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                title: "Follow up with John about pricing",
                type: "AI Suggested",
                priority: "High",
                dueDate: "Today",
                source: "Email from john@company.com"
              },
              {
                title: "Send product demo to Sarah",
                type: "AI Suggested", 
                priority: "Medium",
                dueDate: "Tomorrow",
                source: "Email thread with Sarah"
              },
              {
                title: "Prepare Q4 report",
                type: "Custom",
                priority: "Low", 
                dueDate: "Next week",
                source: "Manual entry"
              }
            ].map((item, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Checkbox disabled />
                    <div>
                      <div className="font-medium">{item.title}</div>
                      <div className="text-sm text-muted-foreground">{item.source}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={item.type === "AI Suggested" ? "default" : "secondary"} 
                           className={item.type === "AI Suggested" ? "bg-primary-light" : ""}>
                      {item.type}
                    </Badge>
                    <Badge variant={item.priority === "High" ? "destructive" : "outline"}>
                      {item.priority}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {item.dueDate}
                  </div>
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    Assigned to you
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
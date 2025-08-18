import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ArrowUpDown, ChevronLeft, ChevronRight, Mail } from "lucide-react";

// Mock data for Backgammon app founder
const mockConversations = [
  {
    id: "1",
    contact: "sarah@casinogames.com",
    subject: "Partnership Opportunity - Cross-Promotion",
    category: "Partnership",
    sentiment: "positive",
    status: "needs_followup",
    ageTier: "less than 1 week",
    snippet: "We'd love to discuss a cross-promotion opportunity between our casino platform and your backgammon app...",
    messageCount: 3,
    lastActivity: "2 days ago"
  },
  {
    id: "2", 
    contact: "mike.player@gmail.com",
    subject: "Game crash during tournament",
    category: "Support",
    sentiment: "negative",
    status: "needs_response",
    ageTier: "less than 1 week",
    snippet: "The app crashed during the final round of the tournament and I lost my entry fee...",
    messageCount: 1,
    lastActivity: "4 hours ago"
  },
  {
    id: "3",
    contact: "jessica@mobilegaming.io",
    subject: "Re: Influencer Campaign Proposal",
    category: "Marketing",
    sentiment: "neutral",
    status: "needs_followup",
    ageTier: "more than 1 week",
    snippet: "Thanks for the proposal. We need to discuss the terms and reach metrics...",
    messageCount: 5,
    lastActivity: "9 days ago"
  },
  {
    id: "4",
    contact: "david.chen@techcrunch.com",
    subject: "Interview Request - Mobile Gaming Trends",
    category: "Press",
    sentiment: "positive",
    status: "needs_response",
    ageTier: "less than 1 week",
    snippet: "We're writing a piece on mobile gaming trends and would love to feature your backgammon app...",
    messageCount: 1,
    lastActivity: "1 day ago"
  },
  {
    id: "5",
    contact: "tournament@backgammonleague.org",
    subject: "Official Tournament Partnership",
    category: "Partnership",
    sentiment: "positive",
    status: "needs_followup",
    ageTier: "more than 2 weeks",
    snippet: "We'd like to make your app the official platform for our upcoming championship series...",
    messageCount: 7,
    lastActivity: "18 days ago"
  },
  {
    id: "6",
    contact: "angry.player@hotmail.com",
    subject: "REFUND REQUEST - Unfair Match",
    category: "Support",
    sentiment: "negative",
    status: "needs_response",
    ageTier: "less than 1 week",
    snippet: "I demand a refund! The matching system is clearly rigged and I keep losing to higher rated players...",
    messageCount: 2,
    lastActivity: "6 hours ago"
  }
];

const categoryColors = {
  Partnership: "bg-blue-100 text-blue-800 border-blue-200",
  Support: "bg-red-100 text-red-800 border-red-200", 
  Marketing: "bg-green-100 text-green-800 border-green-200",
  Press: "bg-purple-100 text-purple-800 border-purple-200"
};

const sentimentIcons = {
  positive: "😊",
  neutral: "😐", 
  negative: "😠"
};

const statusLabels = {
  needs_followup: "Follow Up",
  needs_response: "Respond"
};

export function ConversationsDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("time");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  const filteredConversations = mockConversations.filter(conv =>
    conv.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedConversations = [...filteredConversations].sort((a, b) => {
    if (sortBy === "category") return a.category.localeCompare(b.category);
    if (sortBy === "time") {
      const ageOrder = ["less than 1 week", "more than 1 week", "more than 2 weeks", "more than 1 month"];
      return ageOrder.indexOf(a.ageTier) - ageOrder.indexOf(b.ageTier);
    }
    return 0;
  });

  const followUpConversations = sortedConversations.filter(conv => conv.status === "needs_followup");
  const responseConversations = sortedConversations.filter(conv => conv.status === "needs_response");

  const totalPages = Math.ceil(Math.max(followUpConversations.length, responseConversations.length) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;

  const ConversationCard = ({ conversation }: { conversation: typeof mockConversations[0] }) => (
    <Card className="gradient-card shadow-card hover:shadow-lg transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{conversation.contact}</p>
            <h3 className="font-semibold text-foreground truncate">{conversation.subject}</h3>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <span className="text-lg">{sentimentIcons[conversation.sentiment]}</span>
            <Badge className={categoryColors[conversation.category as keyof typeof categoryColors]}>
              {conversation.category}
            </Badge>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{conversation.snippet}</p>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Mail className="h-3 w-3" />
            <span>{conversation.messageCount} messages</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {conversation.ageTier}
            </Badge>
            <span>{conversation.lastActivity}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Email Opportunities Dashboard</h1>
        <p className="text-muted-foreground">AI-analyzed conversations requiring your attention</p>
      </div>

      {/* Search and Filters */}
      <Card className="gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-48">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time">Time Frame</SelectItem>
                <SelectItem value="category">Category</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Side-by-side Conversations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Follow Up Section */}
        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                {followUpConversations.length}
              </Badge>
              You Should Follow Up
            </CardTitle>
            <CardDescription>Conversations waiting for your follow-up</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {followUpConversations.slice(startIndex, startIndex + itemsPerPage).map((conversation) => (
                  <ConversationCard key={conversation.id} conversation={conversation} />
                ))}
                {followUpConversations.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No follow-ups needed</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Response Section */}
        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
                {responseConversations.length}
              </Badge>
              You Should Respond
            </CardTitle>
            <CardDescription>New messages requiring your response</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {responseConversations.slice(startIndex, startIndex + itemsPerPage).map((conversation) => (
                  <ConversationCard key={conversation.id} conversation={conversation} />
                ))}
                {responseConversations.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No responses needed</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground px-3">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
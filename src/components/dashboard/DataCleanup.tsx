import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CleanupResult {
  duplicateTokensRemoved: number;
  conversationsReassigned: number;
  orphanedConversations: number;
}

interface CleanupResponse {
  success: boolean;
  result?: CleanupResult;
  message?: string;
  error?: string;
}

export default function DataCleanup() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const runCleanup = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('data-cleanup', {
        method: 'POST'
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to run data cleanup');
      }

      const response = data as CleanupResponse;
      
      if (!response.success) {
        throw new Error(response.error || 'Cleanup failed');
      }

      setResult(response.result || null);
      
      toast({
        title: "Data Cleanup Complete",
        description: response.message || "Security analysis completed successfully",
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      
      toast({
        title: "Cleanup Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Data Cleanup
        </CardTitle>
        <CardDescription>
          Analyze and resolve data security issues including duplicate Gmail connections and misassigned conversations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-3">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Security analysis completed successfully.
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {result.duplicateTokensRemoved}
                </div>
                <div className="text-sm text-muted-foreground">
                  Duplicate connections removed
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {result.conversationsReassigned}
                </div>
                <div className="text-sm text-muted-foreground">
                  Conversations reassigned
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {result.orphanedConversations}
                </div>
                <div className="text-sm text-muted-foreground">
                  Orphaned conversations found
                </div>
              </div>
            </div>

            {result.orphanedConversations > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Found {result.orphanedConversations} conversations that may belong to your account but are assigned to other users. 
                  Check the console logs for details. Manual intervention may be required.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={runCleanup} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning && <Loader2 className="h-4 w-4 animate-spin" />}
            Run Security Analysis
          </Button>
          
          <Badge variant="outline" className="self-start">
            Safe to run - Read-only analysis
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>What this does:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Removes duplicate Gmail token connections (keeps most recent)</li>
            <li>Analyzes conversation ownership based on Gmail accounts</li>
            <li>Identifies misassigned conversations that may need manual review</li>
            <li>Logs security issues for further investigation</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
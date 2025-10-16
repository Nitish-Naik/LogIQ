import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiService } from '@/lib/apiService';
import { Activity, TrendingUp } from 'lucide-react';

export default function TotalLogsCard() {
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchTotal = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiService.getLogsCount();
      setTotalLogs(result.total);
      setLastUpdated(new Date(result.timestamp).toLocaleTimeString());
    } catch (err) {
      console.error('Error fetching total logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch total logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTotal();
    
    // Optional: Auto-refresh every 30 seconds
    const interval = setInterval(fetchTotal, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading && !totalLogs ? (
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : (
          <>
            <div className="text-2xl font-bold">{totalLogs.toLocaleString()}</div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">
                All time logs collected
              </p>
              {lastUpdated && (
                <p className="text-xs text-muted-foreground">
                  Updated: {lastUpdated}
                </p>
              )}
            </div>
            <div className="flex items-center mt-2 text-xs text-emerald-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>Live tracking</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

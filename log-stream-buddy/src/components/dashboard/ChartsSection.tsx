import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Activity, Database, Zap, Clock } from "lucide-react";
import { LogFilters } from "@/pages/Index";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/lib/apiService";

interface ChartsSectionProps {
  filters: LogFilters;
}

interface LogEntry {
  _id: string;
  _creationTime: number;
  level: string;
  message: string;
  timestamp: number;
  app_name: string;
  metadata: Record<string, unknown>;
  userId: string;
}

interface LogsStats {
  totalLogs: number;
  logsPerMinuteRecent: number;
  logsPerMinute: number;
  lastLogTimestamp: number;
}

export const ChartsSection = ({ filters }: ChartsSectionProps) => {
  const { user } = useAuth();
  
  // State for logs data
  const [dbLogs, setDbLogs] = useState<LogEntry[]>([]);
  const [logsStats, setLogsStats] = useState<LogsStats>({
    totalLogs: 0,
    logsPerMinuteRecent: 0,
    logsPerMinute: 0,
    lastLogTimestamp: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for app distribution that updates every minute
  const [appDistribution, setAppDistribution] = useState<Array<{name: string, value: number, color: string}>>([]);
  
  // State for logs over time that updates every 5 minutes
  const [logsOverTime, setLogsOverTime] = useState<Array<{time: string, error: number, warning: number, info: number, debug: number}>>([]);
  
  // Ref to store current dbLogs value
  const dbLogsRef = useRef(dbLogs);
  // Track if we've already shown initial data
  const hasShownInitialData = useRef(false);

  // Fetch logs from API
  useEffect(() => {
    const fetchLogs = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch logs with filters
        const response = await apiService.getLogs({
          userId: user.userId,
          level: filters.level.length > 0 ? filters.level[0] : undefined,
          appName: filters.appName.length > 0 ? filters.appName[0] : undefined,
          search: filters.search || undefined,
          limit: 1000, // Get last 1000 logs for analytics
        });

        setDbLogs(response.logs);

        // Calculate stats
        const now = Date.now();
        const fiveMinutesAgo = now - (5 * 60 * 1000);
        const oneHourAgo = now - (60 * 60 * 1000);

        const recentLogs = response.logs.filter(log => log.timestamp >= fiveMinutesAgo);
        const hourlyLogs = response.logs.filter(log => log.timestamp >= oneHourAgo);

        const logsPerMinuteRecent = recentLogs.length / 5;
        const logsPerMinute = hourlyLogs.length / 60;
        const lastLog = response.logs[0]; // Assuming logs are sorted by timestamp desc

        setLogsStats({
          totalLogs: response.total,
          logsPerMinuteRecent,
          logsPerMinute,
          lastLogTimestamp: lastLog ? lastLog.timestamp : 0,
        });

        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching logs:', err);
        setError('Failed to fetch logs data');
        setIsLoading(false);
      }
    };

    fetchLogs();

    // Refresh data every 30 seconds
    const interval = setInterval(fetchLogs, 30000);

    return () => clearInterval(interval);
  }, [user, filters]);

  // Update ref whenever dbLogs changes
  useEffect(() => {
    dbLogsRef.current = dbLogs;
  }, [dbLogs]);

  // Update chart immediately when data first becomes available
  useEffect(() => {
    if (dbLogs && dbLogs.length > 0 && !hasShownInitialData.current) {
      const appCounts: { [key: string]: number } = {};
      dbLogs.forEach(log => {
        appCounts[log.app_name] = (appCounts[log.app_name] || 0) + 1;
      });

      const newAppDistribution = Object.entries(appCounts).map(([name, value], index) => ({
        name,
        value,
        color: [
          "#10b981", "#3b82f6", "#f59e0b", "#ef4444", 
          "#8b5cf6", "#06b6d4", "#84cc16", "#f97316"
        ][index % 8]
      }));

      setAppDistribution(newAppDistribution);
      hasShownInitialData.current = true;
    }
  }, [dbLogs]);

  // Update app distribution every minute instead of on every log change
  useEffect(() => {
    const updateAppDistribution = () => {
      const currentLogs = dbLogsRef.current;
      if (currentLogs && currentLogs.length > 0) {
        const appCounts: { [key: string]: number } = {};
        currentLogs.forEach(log => {
          appCounts[log.app_name] = (appCounts[log.app_name] || 0) + 1;
        });

        const newAppDistribution = Object.entries(appCounts).map(([name, value], index) => ({
          name,
          value,
          color: [
            "#10b981", "#3b82f6", "#f59e0b", "#ef4444", 
            "#8b5cf6", "#06b6d4", "#84cc16", "#f97316"
          ][index % 8]
        }));

        setAppDistribution(newAppDistribution);
      }
    };

    // Set up interval to update every minute (don't update immediately here)
    const interval = setInterval(updateAppDistribution, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, []); // Empty dependency array - only run once on mount

  // Update logs over time every second and when data changes
  useEffect(() => {
    const updateLogsOverTime = () => {
      const currentLogs = dbLogsRef.current;
      if (currentLogs && currentLogs.length > 0) {
        // Get logs from the last 24 hours
        const now = Date.now();
        const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
        
        const recentLogs = currentLogs.filter(log => log.timestamp >= twentyFourHoursAgo);
        
        // Group logs by hour
        const hourlyData: { [hour: string]: { error: number; warning: number; info: number; debug: number } } = {};
        
        // Initialize all 24 hours with zero counts
        for (let i = 23; i >= 0; i--) {
          const hour = new Date(now - (i * 60 * 60 * 1000));
          const hourKey = hour.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          }).substring(0, 5); // Get HH:MM format
          hourlyData[hourKey] = { error: 0, warning: 0, info: 0, debug: 0 };
        }
        
        // Count logs in each hour
        recentLogs.forEach(log => {
          const logTime = new Date(log.timestamp);
          const hourKey = logTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          }).substring(0, 5);
          
          if (hourlyData[hourKey]) {
            hourlyData[hourKey][log.level as keyof typeof hourlyData[string]]++;
          }
        });
        
        // Convert to array format for the chart
        const chartData = Object.entries(hourlyData).map(([time, counts]) => ({
          time,
          ...counts
        }));
        
        setLogsOverTime(chartData);
      }
    };

    // Update immediately when data changes or first becomes available
    updateLogsOverTime();

    // Set up interval to update every second for real-time feel
    const interval = setInterval(updateLogsOverTime, 1000); // 1 second

    return () => clearInterval(interval);
  }, [dbLogs]); // Update when dbLogs changes

  const totalLogs = dbLogs?.length || 0;
  const errorCount = dbLogs?.filter(log => log.level === "error").length || 0;
  const warningCount = dbLogs?.filter(log => log.level === "warning").length || 0;
  const infoCount = dbLogs?.filter(log => log.level === "info").length || 0;
  const debugCount = dbLogs?.filter(log => log.level === "debug").length || 0;

  // Prepare data for charts
  const logsByLevel = [
    { level: "Error", count: errorCount, color: "#ef4444" },
    { level: "Warning", count: warningCount, color: "#f59e0b" },
    { level: "Info", count: infoCount, color: "#3b82f6" },
    { level: "Debug", count: debugCount, color: "#6b7280" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6 mb-8">
        <Card className="bg-gradient-surface shadow-soft">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center gap-2">
              <Database className="h-5 w-5 text-primary animate-pulse" />
              <span className="text-muted-foreground">Loading analytics data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 mb-8">
        <Card className="bg-gradient-surface shadow-soft">
          <CardContent className="p-8 text-center">
            <div className="text-log-error">{error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-8">
      {/* Comprehensive Stats Overview */}
      <Card className="bg-gradient-surface shadow-soft">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Database Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">
                {logsStats?.totalLogs.toLocaleString() || "0"}
              </div>
              <div className="text-sm text-muted-foreground">Total Logs in Database</div>
              <div className="text-xs text-log-success mt-1">All-time accumulated</div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-log-info mb-1">
                {logsStats?.logsPerMinuteRecent?.toFixed(1) || "0.0"}
              </div>
              <div className="text-sm text-muted-foreground">Logs/Minute (5min avg)</div>
              <div className="text-xs text-log-info mt-1">Current generation rate</div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-log-warning mb-1">
                {logsStats?.logsPerMinute?.toFixed(1) || "0.0"}
              </div>
              <div className="text-sm text-muted-foreground">Logs/Minute (1hr avg)</div>
              <div className="text-xs text-log-warning mt-1">Hourly average rate</div>
            </div>

            <div className="text-center">
              <div className="text-lg font-bold text-muted-foreground mb-1">
                {logsStats?.lastLogTimestamp 
                  ? new Date(logsStats.lastLogTimestamp).toLocaleString() 
                  : "Never"}
              </div>
              <div className="text-sm text-muted-foreground">Last Log Timestamp</div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" />
                Most recent activity
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-surface shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Logs</p>
                <p className="text-2xl font-bold">{totalLogs.toLocaleString()}</p>
                <p className="text-xs text-log-success flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Real-time data
                </p>
              </div>
              <Activity className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-surface shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Errors</p>
                <p className="text-2xl font-bold text-log-error">{errorCount.toLocaleString()}</p>
                <p className="text-xs text-log-error">
                  {totalLogs > 0 ? ((errorCount / totalLogs) * 100).toFixed(1) : 0}% of total
                </p>
              </div>
              <div className="h-8 w-8 bg-log-error-bg rounded-lg flex items-center justify-center">
                <div className="h-4 w-4 bg-log-error rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-surface shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Warnings</p>
                <p className="text-2xl font-bold text-log-warning">{warningCount.toLocaleString()}</p>
                <p className="text-xs text-log-warning">
                  {totalLogs > 0 ? ((warningCount / totalLogs) * 100).toFixed(1) : 0}% of total
                </p>
              </div>
              <div className="h-8 w-8 bg-log-warning-bg rounded-lg flex items-center justify-center">
                <div className="h-4 w-4 bg-log-warning rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-surface shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Info Logs</p>
                <p className="text-2xl font-bold text-log-info">{infoCount.toLocaleString()}</p>
                <p className="text-xs text-log-info">
                  {totalLogs > 0 ? ((infoCount / totalLogs) * 100).toFixed(1) : 0}% of total
                </p>
              </div>
              <div className="h-8 w-8 bg-log-info-bg rounded-lg flex items-center justify-center">
                <div className="h-4 w-4 bg-log-info rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logs by Level Bar Chart */}
        <Card className="bg-gradient-surface shadow-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Logs by Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={logsByLevel}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="level" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Bar dataKey="count" fill="url(#colorGradient)" radius={[4, 4, 0, 0]} />
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* App Distribution Pie Chart */}
        <Card className="bg-gradient-surface shadow-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-primary" />
              Logs by Application
              <span className="text-xs text-muted-foreground font-normal">(updates every minute)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={appDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {appDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Logs Over Time Line Chart */}
        <Card className="lg:col-span-2 bg-gradient-surface shadow-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Logs Over Time (24h)
              <span className="text-xs text-muted-foreground font-normal">(updates every second)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={logsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="time" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="error" 
                  stroke="hsl(var(--log-error))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--log-error))", strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="warning" 
                  stroke="hsl(var(--log-warning))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--log-warning))", strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="info" 
                  stroke="hsl(var(--log-info))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--log-info))", strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="debug" 
                  stroke="hsl(var(--log-debug))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--log-debug))", strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
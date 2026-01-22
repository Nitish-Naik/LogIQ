import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Eye,
  Search,
  Calendar,
} from "lucide-react";
import { LogFilters } from "@/pages/Index";
import { LogLevelBadge } from "@/components/dashboard/LogLevelBadge";
import { LogDetailModal } from "@/components/dashboard/LogDetailModal";
import { format } from "date-fns";
import { apiService, LogEntry, type User } from "@/lib/apiService";

interface LogsTableProps {
  filters: LogFilters;
}

// interface LogEntry {
//   _id: string;
//   timestamp: number;
//   level: "error" | "warning" | "info" | "debug";
//   message: string;
//   app_name: string;
//   userId: string;
//   organization: string;
//   meta?: { [key: string]: unknown };
// }

export const LogsTable = ({ filters }: LogsTableProps) => {
  // const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [allLogs, setAllLogs] = useState<LogEntry[]>([]);


  const fetchTotalLogs = async (organizationId: string) => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiService.getLogsCount({ organizationId });
      setTotalLogs(result.total);
      setLastUpdated(new Date(result.timestamp).toLocaleString());
    } catch (error) {
      console.error("Error fetching total logs : ", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch total logs"
      );
    } finally {
      setLoading(false);
    }
  };

useEffect(() => {
  const loadLogs = async () => {
    try {
      const result = await apiService.getCurrentUser(); // returns { user: User }
      const currentUser = result.user;
      if (!currentUser) return;

      const currentOrgId = currentUser.organizationId;
      fetchTotalLogs(currentOrgId);

      const interval = setInterval(() => fetchTotalLogs(currentOrgId), 30000);
      return () => clearInterval(interval);
    } catch (err) {
      console.error("Failed to fetch user or logs", err);
    }
  };

  loadLogs();
}, []);


  const fetchAllLogs = async (organizationId: string) => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiService.getAllLogs({ 
        organizationId,
        limit: 1000,
        orderBy: 'timestamp DESC'
      });
      setAllLogs(result.logs);
    } catch (error) {
      console.error("Error fetching all logs : ", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch all logs(records)"
      );
    } finally {
      setLoading(false);
    }
  };


useEffect(() => {
  const loadLogs = async () => {
    try {
      const result = await apiService.getCurrentUser(); // returns { user: User }
      const currentUser = result.user;
      if (!currentUser) return;

      const currentOrgId = currentUser.organizationId;
      fetchAllLogs(currentOrgId);

      const interval = setInterval(() => fetchTotalLogs(currentOrgId), 30000);
      return () => clearInterval(interval);
    } catch (err) {
      console.error("Failed to fetch user or logs", err);
    }
  };

  loadLogs();
}, []);

  // Transform database logs to match component interface
  const transformLogForModal = (log: LogEntry) => ({
    id: log._id,
    timestamp: new Date(log.timestamp),
    level: log.level,
    message: log.message,
    app_name: log.app_name,
    meta: log.meta,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleExport = () => {
    // In real app, this would trigger CSV/JSON export
    console.log("Exporting logs...");
  };

  // // Filter logs based on current filters
  const filteredLogs = (allLogs || []).filter((log) => {
    if (filters.level.length > 0 && !filters.level.includes(log.level))
      return false;
    if (filters.appName.length > 0 && !filters.appName.includes(log.app_name))
      return false;
    if (
      filters.search &&
      !log.message.toLowerCase().includes(filters.search.toLowerCase())
    )
      return false;
    return true;
  });

  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-4">
      {/* Table Header */}
      <Card className="bg-gradient-surface shadow-soft">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Logs ({totalLogs})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Logs Table */}
      <Card className="bg-gradient-surface shadow-elevated">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="w-[140px]">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Timestamp
                  </div>
                </TableHead>
                <TableHead className="w-[80px]">Level</TableHead>
                <TableHead className="w-[140px]">Application</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLogs.map((log) => (
                <TableRow
                  key={log._id}
                  className="border-border hover:bg-muted/50"
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {format(new Date(log.timestamp), "HH:mm:ss.SSS")}
                    <div className="text-xs opacity-60">
                      {format(new Date(log.timestamp), "MMM dd")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <LogLevelBadge level={log.level} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {log.app_name}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div
                      className="font-mono text-sm truncate"
                      title={log.message}
                    >
                      {log.message}
                    </div>
                    {log.meta && Object.keys(log.meta).length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {Object.entries(log.meta)
                          .slice(0, 2)
                          .map(([key, value]) => (
                            <Badge
                              key={`${log._id}-${key}`}
                              variant="outline"
                              className="text-xs"
                            >
                              {key}: {String(value).substring(0, 10)}
                              {String(value).length > 10 && "..."}
                            </Badge>
                          ))}
                        {/* {Object.keys(log.meta).length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{Object.keys(log.meta).length - 2} more
                          </Badge>
                        )} */}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedLog(log);
                        setIsDetailModalOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to{" "}
              {Math.min(startIndex + pageSize, filteredLogs.length)} of{" "}
              {filteredLogs.length} logs
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log Detail Modal */}
      <LogDetailModal
        log={selectedLog ? transformLogForModal(selectedLog) : null}
        open={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedLog(null);
        }}
      />
    </div>
  );
};

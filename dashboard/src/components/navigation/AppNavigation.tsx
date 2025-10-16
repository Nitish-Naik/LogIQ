import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Settings,
  FileBarChart,
  Activity,
  Bell,
  Database,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

import { cn } from "@/lib/utils";

import { apiService } from "@/lib/apiService";

const navigationItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview and live logs",
  },
  {
    title: "Reports",
    href: "/reports",
    icon: FileBarChart,
    description: "Daily reports and analytics",
  },
  {
    title: "Team",
    href: "/team",
    icon: Users,
    description: "Team management",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Organization settings",
  },
];

export const AppNavigation = () => {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const isCollapsed = state === "collapsed";
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // Mock data for stats
  const stats = {
    totalLogs: 1000,
    errorCount: 50,
    warningCount: 100,
    errorRate: "5.00",
  };

  // Mock data for activity status
  const activityStatus = {
    status: "active",
    label: "Active",
    color: "bg-green-400",
    rate: 10,
  };

  // Mock data for uptime stats
  const uptimeStats = {
    uptimePercentage: "99.95",
    timeSinceLastError: 20 * 60 * 60 * 1000,
    uptimeDisplay: "20h 0m",
  };

  const fetchTotalLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiService.getLogsCount();
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
    fetchTotalLogs();

    // Optional: Auto-refresh every 30 seconds
    const interval = setInterval(fetchTotalLogs, 30000);

    return () => clearInterval(interval);
  }, []);

  const uptimePercentage = uptimeStats.uptimePercentage;
  const uptimeDisplay = uptimeStats.uptimeDisplay;

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Alt + number shortcuts for navigation
      if (event.altKey && !event.ctrlKey && !event.shiftKey) {
        const num = parseInt(event.key);
        if (num >= 1 && num <= navigationItems.length) {
          event.preventDefault();
          navigate(navigationItems[num - 1].href);
        }
      }

      // Alt + D for Dashboard
      if (event.altKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        navigate("/dashboard");
      }

      // Alt + R for Reports
      if (event.altKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        navigate("/reports");
      }

      // Alt + T for Team
      if (event.altKey && event.key.toLowerCase() === "t") {
        event.preventDefault();
        navigate("/team");
      }

      // Alt + S for Settings
      if (event.altKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        navigate("/settings");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(href);
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent className="bg-card border-0">
        {!isCollapsed && (
          <>
            <SidebarGroup>
              <div className="flex items-center gap-3 p-4">
                <div className="h-8 w-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow">
                  <Activity className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">
                    Instant Dev Logs
                  </h2>
                  <p className="text-xs text-muted-foreground">Dashboard</p>
                </div>
              </div>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive(item.href)}>
                        <NavLink
                          to={item.href}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )
                          }
                        >
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Quick Stats
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div
                  className="px-3 py-2 space-y-3"
                  role="region"
                  aria-label="System statistics"
                >
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Database
                        className="h-3 w-3 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="text-muted-foreground">Total Logs</span>
                    </div>
                    
                      <span
                        className="font-medium"
                        aria-label={`${stats.totalLogs.toLocaleString()} total logs in system`}
                      >
                        {totalLogs.toLocaleString()}
                      </span>
                    
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        className="h-3 w-3 text-log-error"
                        aria-hidden="true"
                      />
                      <span className="text-muted-foreground">Error Rate</span>
                    </div>
                    <span
                      className="font-medium text-log-error"
                      aria-label={`Error rate: ${stats.errorRate} percent`}
                    >
                      {stats.errorRate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Bell
                        className="h-3 w-3 text-log-warning"
                        aria-hidden="true"
                      />
                      <span className="text-muted-foreground">Warnings</span>
                    </div>
                    <span
                      className="font-medium text-log-warning"
                      aria-label={`${stats.warningCount} warning logs`}
                    >
                      {stats.warningCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Clock
                        className="h-3 w-3 text-status-online"
                        aria-hidden="true"
                      />
                      <span className="text-muted-foreground">Uptime</span>
                    </div>
                    <div className="text-right">
                      <div
                        className="font-medium text-status-online"
                        aria-label={`System uptime: ${uptimePercentage} percent`}
                      >
                        {uptimePercentage}%
                      </div>
                      <div
                        className="text-xs text-muted-foreground"
                        aria-label={`Time since last error: ${uptimeDisplay}`}
                      >
                        {uptimeDisplay}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle
                        className="h-3 w-3 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="text-muted-foreground">
                        System Health
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div
                        className={`h-2 w-2 rounded-full ${stats.errorCount > 0 ? "bg-log-error animate-pulse" : "bg-status-online"}`}
                        aria-hidden="true"
                      />
                      <span
                        className={`font-medium ${stats.errorCount > 0 ? "text-log-error" : "text-status-online"}`}
                        aria-label={`System health: ${stats.errorCount > 0 ? "Issues detected" : "System healthy"}`}
                      >
                        {stats.errorCount > 0 ? "Issues" : "Healthy"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Zap
                        className="h-3 w-3 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="text-muted-foreground">Activity</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div
                        className={`h-2 w-2 rounded-full ${activityStatus.color}`}
                        aria-hidden="true"
                      />
                      <span
                        className="font-medium text-muted-foreground"
                        aria-label={`System activity: ${activityStatus.label}`}
                      >
                        {activityStatus.label}
                      </span>
                    </div>
                  </div>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>

            {!isCollapsed && (
              <SidebarGroup>
                <SidebarGroupContent>
                  <div className="px-3 py-2">
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="font-medium text-muted-foreground/80">
                        Keyboard Shortcuts:
                      </div>
                      <div>Alt+1-4: Navigate</div>
                      <div>Alt+D/R/T/S: Quick nav</div>
                    </div>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </>
        )}

        {isCollapsed && (
          <div className="flex flex-col items-center py-4 space-y-4">
            <div className="h-8 w-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            {navigationItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    "p-2 rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )
                }
                title={item.title}
              >
                <item.icon className="h-5 w-5" />
              </NavLink>
            ))}
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
};

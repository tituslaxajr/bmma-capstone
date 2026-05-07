import React, { useState, useEffect } from "react";
import { apiFetch } from "../lib/supabase";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle, 
  Database, 
  RefreshCw,
  Info,
  TrendingUp,
  FileText,
  Activity
} from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";

/* Token aliases — this file was written before cinematic-tokens standard */
const DX = {
  cardBg: DT.elevated,
  primary: DT.blue,
  textPrimary: DT.textPri,
  textSecondary: DT.textSec,
  bgSecondary: DT.raised,
  bg: DT.base,
  borderColor: DT.borderDef,
} as const;

interface IntegrityIssue {
  severity: "low" | "medium" | "high" | "critical";
  category: string;
  table: string;
  count: number;
  message: string;
  sample?: any[];
}

interface IntegrityReport {
  timestamp: string;
  status: "healthy" | "healthy_with_warnings" | "needs_attention" | "critical";
  issues: IntegrityIssue[];
  warnings: IntegrityIssue[];
  criticalErrors: IntegrityIssue[];
  stats: Record<string, number>;
  summary: {
    totalIssues: number;
    totalWarnings: number;
    totalCriticalErrors: number;
    totalTables: number;
    totalRecords: number;
  };
}

interface HealthCheck {
  status: string;
  timestamp: string;
  counts: {
    users: number;
    groups: number;
    submissions: number;
    defenses: number;
  };
  database: string;
}

export function DataIntegrityDashboard() {
  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "issues" | "stats">("overview");
  const [migrating, setMigrating] = useState(false);
  const [migrationLog, setMigrationLog] = useState<string[] | null>(null);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [integrityData, healthData] = await Promise.all([
        apiFetch<IntegrityReport>("/admin/data-integrity"),
        apiFetch<HealthCheck>("/admin/health-check"),
      ]);
      setReport(integrityData);
      setHealth(healthData);
    } catch (err) {
      console.error("Failed to fetch integrity data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const runKvMigration = async () => {
    try {
      setMigrating(true);
      setMigrationLog(null);
      const result = await apiFetch<{ message: string; totalMigrated: number; log: string[] }>("/admin/migrate-kv", { method: "POST" });
      setMigrationLog(result.log || [`${result.message} — ${result.totalMigrated ?? 0} records`]);
      await fetchData();
    } catch (err) {
      console.error("KV migration failed:", err);
      setMigrationLog([`Migration failed: ${err}`]);
    } finally {
      setMigrating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy": return DT.success;
      case "healthy_with_warnings": return DT.yellow;
      case "needs_attention": return DT.warning;
      case "critical": return DT.red;
      default: return DT.textTer;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <AlertCircle className="w-5 h-5" style={{ color: DT.red }} />;
      case "high": return <AlertTriangle className="w-5 h-5" style={{ color: DT.warning }} />;
      case "medium": return <Info className="w-5 h-5" style={{ color: DT.yellow }} />;
      default: return <Info className="w-5 h-5" style={{ color: DT.blue }} />;
    }
  };

  const formatTimestamp = (ts: string) => {
    return new Date(ts).toLocaleString();
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!report || !health) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: DT.red }} />
        <h2 className="text-xl font-semibold mb-2" style={{ color: DX.textPrimary }}>
          Failed to load integrity data
        </h2>
        <Button onClick={fetchData}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: DX.bg }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: DX.textPrimary }}>
            Data Integrity Dashboard
          </h1>
          <p style={{ color: DX.textSecondary }}>
            Last updated: {formatTimestamp(report.timestamp)}
          </p>
        </div>
        <Button
          onClick={fetchData}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card 
          className="p-6"
          style={{ 
            backgroundColor: DX.cardBg,
            borderColor: getStatusColor(report.status),
            borderWidth: 2
          }}
        >
          <div className="flex items-center gap-4">
            {report.status === "healthy" ? (
              <CheckCircle className="w-10 h-10" style={{ color: DT.success }} />
            ) : report.status === "critical" ? (
              <AlertCircle className="w-10 h-10" style={{ color: DT.red }} />
            ) : (
              <AlertTriangle className="w-10 h-10" style={{ color: DT.warning }} />
            )}
            <div>
              <p style={{ color: DX.textSecondary }} className="text-sm">Status</p>
              <p className="text-xl font-bold capitalize" style={{ color: getStatusColor(report.status) }}>
                {report.status.replace(/_/g, " ")}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6" style={{ backgroundColor: DX.cardBg }}>
          <div className="flex items-center gap-4">
            <Database className="w-10 h-10" style={{ color: DT.blue }} />
            <div>
              <p style={{ color: DX.textSecondary }} className="text-sm">Total Records</p>
              <p className="text-xl font-bold" style={{ color: DX.textPrimary }}>
                {report.summary.totalRecords.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6" style={{ backgroundColor: DX.cardBg }}>
          <div className="flex items-center gap-4">
            <TrendingUp className="w-10 h-10" style={{ color: DT.purple }} />
            <div>
              <p style={{ color: DX.textSecondary }} className="text-sm">Active Tables</p>
              <p className="text-xl font-bold" style={{ color: DX.textPrimary }}>
                {report.summary.totalTables}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6" style={{ backgroundColor: DX.cardBg }}>
          <div className="flex items-center gap-4">
            <Activity className="w-10 h-10" style={{ color: health.database === "connected" ? DT.success : DT.red }} />
            <div>
              <p style={{ color: DX.textSecondary }} className="text-sm">Database</p>
              <p className="text-xl font-bold capitalize" style={{ color: DX.textPrimary }}>
                {health.database}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Issue Summary */}
      {(report.criticalErrors.length > 0 || report.issues.length > 0 || report.warnings.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {report.criticalErrors.length > 0 && (
            <Card className="p-4" style={{ backgroundColor: DX.cardBg, borderLeft: `4px solid ${DT.red}` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6" style={{ color: DT.red }} />
                  <span style={{ color: DX.textPrimary }} className="font-semibold">Critical Errors</span>
                </div>
                <Badge className="bg-red-500 text-white border-0">
                  {report.criticalErrors.length}
                </Badge>
              </div>
            </Card>
          )}

          {report.issues.length > 0 && (
            <Card className="p-4" style={{ backgroundColor: DX.cardBg, borderLeft: `4px solid ${DT.warning}` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6" style={{ color: DT.warning }} />
                  <span style={{ color: DX.textPrimary }} className="font-semibold">Issues</span>
                </div>
                <Badge className="bg-orange-500 text-white border-0">
                  {report.issues.length}
                </Badge>
              </div>
            </Card>
          )}

          {report.warnings.length > 0 && (
            <Card className="p-4" style={{ backgroundColor: DX.cardBg, borderLeft: `4px solid ${DT.yellow}` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Info className="w-6 h-6" style={{ color: DT.yellow }} />
                  <span style={{ color: DX.textPrimary }} className="font-semibold">Warnings</span>
                </div>
                <Badge className="bg-yellow-500 text-white border-0">
                  {report.warnings.length}
                </Badge>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b" style={{ borderColor: DX.borderColor }}>
        {(["overview", "issues", "stats"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-6 py-3 font-medium capitalize transition-colors"
            style={{
              color: activeTab === tab ? DX.primary : DX.textSecondary,
              borderBottom: activeTab === tab ? `2px solid ${DX.primary}` : "none",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(health.counts).map(([key, value]) => (
              <Card key={key} className="p-4" style={{ backgroundColor: DX.cardBg }}>
                <p style={{ color: DX.textSecondary }} className="text-sm capitalize mb-1">{key}</p>
                <p className="text-2xl font-bold" style={{ color: DX.textPrimary }}>{value}</p>
              </Card>
            ))}
          </div>

          {/* All Issues Combined */}
          {[...report.criticalErrors, ...report.issues, ...report.warnings].length === 0 ? (
            <Card className="p-12 text-center" style={{ backgroundColor: DX.cardBg }}>
              <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: DT.success }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: DX.textPrimary }}>
                All Clear! 
              </h3>
              <p style={{ color: DX.textSecondary }}>
                No data integrity issues detected. Your database is healthy.
              </p>
            </Card>
          ) : (
            <Card className="p-6" style={{ backgroundColor: DX.cardBg }}>
              <h3 className="text-xl font-semibold mb-4" style={{ color: DX.textPrimary }}>
                Recent Issues
              </h3>
              <div className="space-y-4">
                {[...report.criticalErrors, ...report.issues, ...report.warnings].slice(0, 5).map((issue, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-4 p-4 rounded-lg"
                    style={{ backgroundColor: DX.bgSecondary }}
                  >
                    {getSeverityIcon(issue.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold" style={{ color: DX.textPrimary }}>
                          {issue.table}
                        </span>
                        <Badge variant="outline">
                          {issue.category}
                        </Badge>
                      </div>
                      <p style={{ color: DX.textSecondary }} className="text-sm">
                        {issue.message}
                      </p>
                    </div>
                    <span 
                      className="px-3 py-1 rounded-md text-xs font-semibold text-white"
                      style={{ backgroundColor: getStatusColor(issue.severity) }}
                    >
                      {issue.count}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === "issues" && (
        <div className="space-y-6">
          {/* Critical Errors */}
          {report.criticalErrors.length > 0 && (
            <Card className="p-6" style={{ backgroundColor: DX.cardBg }}>
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: DT.red }}>
                <AlertCircle className="w-6 h-6" />
                Critical Errors ({report.criticalErrors.length})
              </h3>
              <div className="space-y-4">
                {report.criticalErrors.map((issue, idx) => (
                  <IssueCard key={idx} issue={issue} />
                ))}
              </div>
            </Card>
          )}

          {/* High/Medium Issues */}
          {report.issues.length > 0 && (
            <Card className="p-6" style={{ backgroundColor: DX.cardBg }}>
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: DT.warning }}>
                <AlertTriangle className="w-6 h-6" />
                Issues ({report.issues.length})
              </h3>
              <div className="space-y-4">
                {report.issues.map((issue, idx) => (
                  <IssueCard key={idx} issue={issue} />
                ))}
              </div>
            </Card>
          )}

          {/* Warnings */}
          {report.warnings.length > 0 && (
            <Card className="p-6" style={{ backgroundColor: DX.cardBg }}>
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: DT.yellow }}>
                <Info className="w-6 h-6" />
                Warnings ({report.warnings.length})
              </h3>
              <div className="space-y-4">
                {report.warnings.map((issue, idx) => (
                  <IssueCard key={idx} issue={issue} />
                ))}
              </div>
            </Card>
          )}

          {[...report.criticalErrors, ...report.issues, ...report.warnings].length === 0 && (
            <Card className="p-12 text-center" style={{ backgroundColor: DX.cardBg }}>
              <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: DT.success }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: DX.textPrimary }}>
                No Issues Found
              </h3>
            </Card>
          )}
        </div>
      )}

      {activeTab === "stats" && (
        <Card className="p-6" style={{ backgroundColor: DX.cardBg }}>
          <h3 className="text-xl font-semibold mb-6" style={{ color: DX.textPrimary }}>
            Table Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(report.stats)
              .filter(([_, count]) => count >= 0)
              .sort(([_, a], [__, b]) => b - a)
              .map(([table, count]) => (
                <div
                  key={table}
                  className="p-4 rounded-lg flex items-center justify-between"
                  style={{ backgroundColor: DX.bgSecondary }}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5" style={{ color: DT.blue }} />
                    <span style={{ color: DX.textPrimary }} className="font-medium">
                      {table}
                    </span>
                  </div>
                  <span className="text-lg font-bold" style={{ color: DX.primary }}>
                    {count.toLocaleString()}
                  </span>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* KV → SQL Migration Tool */}
      <Card className="p-6 mt-8" style={{ backgroundColor: DX.cardBg, borderLeft: `4px solid ${DX.primary}` }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold flex items-center gap-2" style={{ color: DX.textPrimary }}>
              <Database className="w-6 h-6" style={{ color: DX.primary }} />
              KV → SQL Data Migration
            </h3>
            <p className="text-sm mt-1" style={{ color: DX.textSecondary }}>
              Transfer data from the legacy KV store (kv_store_36da3eb1) into the new relational SQL tables. Safe to run multiple times.
            </p>
          </div>
          <Button
            onClick={runKvMigration}
            disabled={migrating}
            className="flex items-center gap-2"
            style={{ backgroundColor: DX.primary }}
          >
            {migrating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Database className="w-4 h-4" />
            )}
            {migrating ? "Migrating..." : "Run Migration"}
          </Button>
        </div>
        {migrationLog && (
          <div className="mt-4 p-4 rounded-lg overflow-auto max-h-80" style={{ backgroundColor: DX.bg }}>
            <pre className="text-xs whitespace-pre-wrap" style={{ color: DX.textSecondary }}>
              {migrationLog.join("\n")}
            </pre>
          </div>
        )}
      </Card>
    </div>
  );
}

function IssueCard({ issue }: { issue: IntegrityIssue }) {
  const [expanded, setExpanded] = useState(false);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return DT.red;
      case "high": return DT.warning;
      case "medium": return DT.yellow;
      default: return DT.blue;
    }
  };

  return (
    <div
      className="p-4 rounded-lg border"
      style={{ 
        backgroundColor: DX.bgSecondary,
        borderColor: getSeverityColor(issue.severity)
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-lg" style={{ color: DX.textPrimary }}>
              {issue.table}
            </span>
            <span
              className="px-2 py-0.5 rounded-md text-xs font-semibold text-white"
              style={{ backgroundColor: getSeverityColor(issue.severity) }}
            >
              {issue.severity}
            </span>
            <Badge variant="outline">
              {issue.category}
            </Badge>
          </div>
          <p style={{ color: DX.textSecondary }} className="mb-2">
            {issue.message}
          </p>
        </div>
        <span
          className="ml-4 px-3 py-1 rounded-md text-xs font-semibold text-white"
          style={{ backgroundColor: DX.primary }}
        >
          {issue.count} records
        </span>
      </div>

      {issue.sample && issue.sample.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm font-medium underline"
            style={{ color: DX.primary }}
          >
            {expanded ? "Hide" : "Show"} sample data
          </button>
          {expanded && (
            <pre
              className="mt-2 p-3 rounded text-xs overflow-auto"
              style={{ backgroundColor: DX.bg, color: DX.textSecondary }}
            >
              {JSON.stringify(issue.sample, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
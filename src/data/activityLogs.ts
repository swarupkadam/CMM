export type ActivityLog = {
  id: string;
  timestamp: string;
  vmName: string;
  action: string;
  triggeredBy: "User" | "Scheduler";
};

export const activityLogs: ActivityLog[] = [
  {
    id: "log-001",
    timestamp: "2026-02-08 08:12:24",
    vmName: "prod-web-01",
    action: "Restart",
    triggeredBy: "User",
  },
  {
    id: "log-002",
    timestamp: "2026-02-08 07:45:11",
    vmName: "prod-api-01",
    action: "Start",
    triggeredBy: "Scheduler",
  },
  {
    id: "log-003",
    timestamp: "2026-02-07 22:19:02",
    vmName: "staging-app-02",
    action: "Stop",
    triggeredBy: "User",
  },
  {
    id: "log-004",
    timestamp: "2026-02-07 18:02:47",
    vmName: "dev-build-04",
    action: "Start",
    triggeredBy: "Scheduler",
  },
];

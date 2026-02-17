import { useMemo } from "react";
import { ActivityLog } from "../../data/activityLogs";

export const useSummaryStats = (logs: ActivityLog[]) => {
  return useMemo(() => {
    const totalActions = logs.length;
    const userActions = logs.filter((log) => log.triggeredBy === "User").length;
    const schedulerActions = logs.filter((log) => log.triggeredBy === "Scheduler").length;

    return { totalActions, userActions, schedulerActions };
  }, [logs]);
};

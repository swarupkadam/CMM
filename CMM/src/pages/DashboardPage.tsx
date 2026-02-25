import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { Card } from "../components/shared/Card";
import { PageHeader } from "../components/shared/PageHeader";
import { DashboardSkeletonCard } from "../components/shared/DashboardSkeletonCard";
import { activityLogs } from "../data/activityLogs";
import type { VM } from "../types/vm";
import { useSummaryStats } from "../components/shared/useSummaryStats";

type FetchVmsOptions = {
  signal?: AbortSignal;
  showLoading?: boolean;
  clearError?: boolean;
};

const SKELETON_CARD_COUNT = 4;
const MIN_SKELETON_DISPLAY_MS = 1000;

const getPowerBadgeClass = (powerState: string) => {
  const normalized = powerState.toLowerCase();
  if (normalized.includes("running")) {
    return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200";
  }
  return "bg-rose-100 text-rose-700 ring-1 ring-rose-200";
};

const DashboardPage = () => {
  const stats = useSummaryStats(activityLogs);
  const [vms, setVms] = useState<VM[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showEmptyState, setShowEmptyState] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const emptyStateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emptyStateDelayResolveRef = useRef<(() => void) | null>(null);
  const loadingRequestIdRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  const cards = useMemo(
    () => [
      { label: "Total Actions", value: stats.totalActions },
      { label: "User Triggered", value: stats.userActions },
      { label: "Scheduler Triggered", value: stats.schedulerActions },
    ],
    [stats]
  );

  const fetchVms = useCallback(async (options: FetchVmsOptions = {}) => {
    const { signal, showLoading = true, clearError = true } = options;
    const requestStartedAt = Date.now();
    const requestId = showLoading ? ++loadingRequestIdRef.current : loadingRequestIdRef.current;

    if (showLoading) {
      setIsLoading(true);
      setShowEmptyState(false);

      if (emptyStateTimeoutRef.current) {
        clearTimeout(emptyStateTimeoutRef.current);
        emptyStateTimeoutRef.current = null;
      }

      if (emptyStateDelayResolveRef.current) {
        emptyStateDelayResolveRef.current();
        emptyStateDelayResolveRef.current = null;
      }
    }

    if (clearError) {
      setError(null);
    }

    try {
      const response = await fetch("http://localhost:5000/vms", { signal });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data: VM[] = await response.json();

      if (showLoading && requestId !== loadingRequestIdRef.current) {
        return null;
      }

      setVms(data);

      if (showLoading) {
        if (data.length > 0) {
          setShowEmptyState(false);
          setIsLoading(false);
          return data;
        }

        const elapsed = Date.now() - requestStartedAt;
        const delayMs = Math.max(0, MIN_SKELETON_DISPLAY_MS - elapsed);

        if (delayMs > 0) {
          await new Promise<void>((resolve) => {
            emptyStateDelayResolveRef.current = resolve;
            emptyStateTimeoutRef.current = setTimeout(() => {
              emptyStateTimeoutRef.current = null;
              emptyStateDelayResolveRef.current = null;
              resolve();
            }, delayMs);
          });
        }

        if (!isMountedRef.current || requestId !== loadingRequestIdRef.current) {
          return null;
        }

        setShowEmptyState(true);
        setIsLoading(false);
      }

      return data;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return null;
      }

      const message = err instanceof Error ? err.message : "Failed to fetch virtual machines.";
      if (clearError) {
        setError(message);
      }

      if (showLoading && requestId === loadingRequestIdRef.current) {
        setShowEmptyState(false);
        setIsLoading(false);
      }

      return null;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    const controller = new AbortController();
    void fetchVms({ signal: controller.signal });

    return () => {
      isMountedRef.current = false;
      controller.abort();

      if (emptyStateTimeoutRef.current) {
        clearTimeout(emptyStateTimeoutRef.current);
        emptyStateTimeoutRef.current = null;
      }

      if (emptyStateDelayResolveRef.current) {
        emptyStateDelayResolveRef.current();
        emptyStateDelayResolveRef.current = null;
      }
    };
  }, [fetchVms]);

  return (
    <div>
      <PageHeader
        title="Automation Overview"
        subtitle="Monitor VM automation status and recent activity."
      />

      <div className="grid gap-6 md:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              {card.label}
            </p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{card.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Azure Virtual Machines</h2>

        {error && (
          <p className="mt-3 text-sm text-red-600">Error loading virtual machines: {error}</p>
        )}

        {!error && (
          <div className="mt-4 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {isLoading ? (
              Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
                <DashboardSkeletonCard key={`dashboard-vm-skeleton-${index}`} />
              ))
            ) : vms.length > 0 ? (
              vms.map((vm) => (
                <Card key={`${vm.resourceGroup}-${vm.name}`}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold text-slate-900">{vm.name}</h3>
                    <span
                      className={clsx(
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                        getPowerBadgeClass(vm.powerState)
                      )}
                    >
                      {vm.powerState}
                    </span>
                  </div>

                  <dl className="mt-4 space-y-2 text-sm text-slate-600">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="font-medium text-slate-500">Resource Group</dt>
                      <dd className="text-right font-medium text-slate-700">{vm.resourceGroup}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="font-medium text-slate-500">Location</dt>
                      <dd className="text-right font-medium text-slate-700">{vm.location}</dd>
                    </div>
                  </dl>
                </Card>
              ))
            ) : showEmptyState ? (
              <Card>
                <p className="text-sm text-slate-500">No virtual machines found.</p>
              </Card>
            ) : (
              Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
                <DashboardSkeletonCard key={`dashboard-vm-delayed-empty-${index}`} />
              ))
            )}
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold text-slate-900">Operational Notes</h3>
          <p className="mt-3 text-sm text-slate-500">
            Keep production workloads within approved schedules and validate off-hour automation to
            control cost. Review the scheduler weekly for conflicts.
          </p>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold text-slate-900">Next Maintenance Window</h3>
          <p className="mt-3 text-sm text-slate-500">
            Friday 22:00 UTC - running automated restarts across production nodes.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;

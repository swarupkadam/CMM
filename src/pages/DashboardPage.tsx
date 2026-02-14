import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "../components/shared/Card";
import { PageHeader } from "../components/shared/PageHeader";
import { VMCard, type VMAction } from "../components/shared/VMCard";
import { activityLogs } from "../data/activityLogs";
import type { VM } from "../types/vm";
import { useSummaryStats } from "../components/shared/useSummaryStats";

type FetchVmsOptions = {
  signal?: AbortSignal;
  showLoading?: boolean;
  clearError?: boolean;
};

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 30;

const getVmKey = (vm: Pick<VM, "name" | "resourceGroup">) => `${vm.resourceGroup}-${vm.name}`;

const DashboardPage = () => {
  const stats = useSummaryStats(activityLogs);
  const [vms, setVms] = useState<VM[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [vmActionLoading, setVmActionLoading] = useState<Record<string, VMAction | null>>({});
  const [vmActionError, setVmActionError] = useState<Record<string, string | null>>({});

  const pollIntervalIdsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const pollRequestInFlightRef = useRef<Record<string, boolean>>({});

  const cards = useMemo(
    () => [
      { label: "Total Actions", value: stats.totalActions },
      { label: "User Triggered", value: stats.userActions },
      { label: "Scheduler Triggered", value: stats.schedulerActions },
    ],
    [stats]
  );

  const setVmLoadingState = useCallback((vmKey: string, value: VMAction | null) => {
    setVmActionLoading((prev) => ({ ...prev, [vmKey]: value }));
  }, []);

  const setVmErrorState = useCallback((vmKey: string, value: string | null) => {
    setVmActionError((prev) => ({ ...prev, [vmKey]: value }));
  }, []);

  const fetchVms = useCallback(async (options: FetchVmsOptions = {}) => {
    const { signal, showLoading = true, clearError = true } = options;

    if (showLoading) {
      setLoading(true);
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
      setVms(data);
      return data;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return null;
      }

      const message = err instanceof Error ? err.message : "Failed to fetch virtual machines.";

      if (clearError) {
        setError(message);
      }

      return null;
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  const clearVmPoll = useCallback((vmKey: string) => {
    const intervalId = pollIntervalIdsRef.current[vmKey];

    if (intervalId) {
      clearInterval(intervalId);
      delete pollIntervalIdsRef.current[vmKey];
    }

    delete pollRequestInFlightRef.current[vmKey];
  }, []);

  const startVmStatePolling = useCallback(
    (vmKey: string, initialPowerState: string) => {
      clearVmPoll(vmKey);
      const initialState = initialPowerState.toLowerCase();
      let attempts = 0;

      const checkForStateChange = async () => {
        if (pollRequestInFlightRef.current[vmKey]) {
          return;
        }

        pollRequestInFlightRef.current[vmKey] = true;
        attempts += 1;

        try {
          const latestVms = await fetchVms({ showLoading: false, clearError: false });
          const targetVm = latestVms?.find((vm) => getVmKey(vm) === vmKey);
          const didStateChange = !!targetVm && targetVm.powerState.toLowerCase() !== initialState;

          if (didStateChange) {
            clearVmPoll(vmKey);
            setVmLoadingState(vmKey, null);
            return;
          }

          if (attempts >= MAX_POLL_ATTEMPTS) {
            clearVmPoll(vmKey);
            setVmLoadingState(vmKey, null);
            setVmErrorState(vmKey, "Timed out waiting for VM status update. Please refresh.");
          }
        } finally {
          delete pollRequestInFlightRef.current[vmKey];
        }
      };

      void checkForStateChange();
      pollIntervalIdsRef.current[vmKey] = setInterval(() => {
        void checkForStateChange();
      }, POLL_INTERVAL_MS);
    },
    [clearVmPoll, fetchVms, setVmErrorState, setVmLoadingState]
  );

  const handleVmAction = useCallback(
    async (vm: VM, action: VMAction) => {
      const vmKey = getVmKey(vm);
      setVmLoadingState(vmKey, action);
      setVmErrorState(vmKey, null);
      clearVmPoll(vmKey);

      try {
        const endpoint = action === "start" ? "/vm/start" : "/vm/stop";
        const response = await fetch(`http://localhost:5000${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: vm.name,
            resourceGroup: vm.resourceGroup,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const message =
            payload && typeof payload.message === "string"
              ? payload.message
              : `Failed to ${action} VM`;
          throw new Error(message);
        }

        startVmStatePolling(vmKey, vm.powerState);
      } catch (actionError) {
        const message =
          actionError instanceof Error ? actionError.message : `Failed to ${action} VM`;
        setVmErrorState(vmKey, message);
        setVmLoadingState(vmKey, null);
      }
    },
    [clearVmPoll, setVmErrorState, setVmLoadingState, startVmStatePolling]
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchVms({ signal: controller.signal });

    return () => {
      controller.abort();
      Object.keys(pollIntervalIdsRef.current).forEach((vmKey) => clearVmPoll(vmKey));
    };
  }, [clearVmPoll, fetchVms]);

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

        {loading && <p className="mt-3 text-sm text-slate-500">Loading virtual machines...</p>}

        {error && (
          <p className="mt-3 text-sm text-red-600">Error loading virtual machines: {error}</p>
        )}

        {!loading && !error && (
          <div className="mt-4 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {vms.length === 0 ? (
              <Card>
                <p className="text-sm text-slate-500">No virtual machines found.</p>
              </Card>
            ) : (
              vms.map((vm) => {
                const vmKey = getVmKey(vm);

                return (
                  <VMCard
                    key={vmKey}
                    vm={vm}
                    onAction={handleVmAction}
                    loadingAction={vmActionLoading[vmKey] ?? null}
                    actionError={vmActionError[vmKey] ?? null}
                  />
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold text-slate-900">Operational Notes</h3>
          <p className="mt-3 text-sm text-slate-500">
            Keep production workloads within approved schedules and validate off-hour
            automation to control cost. Review the scheduler weekly for conflicts.
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

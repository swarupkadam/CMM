import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "../components/shared/PageHeader";
import { Card } from "../components/shared/Card";
import { VMCard, type VMAction } from "../components/shared/VMCard";
import { CreateEnvironmentModal } from "../components/shared/CreateEnvironmentModal";
import { ToastContainer, type Toast } from "../components/shared/Toast";
import type { VM } from "../types/vm";

type FetchVmsOptions = {
  signal?: AbortSignal;
  showLoading?: boolean;
  clearError?: boolean;
};

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 30;

const getVmKey = (vm: Pick<VM, "name" | "resourceGroup">) => `${vm.resourceGroup}-${vm.name}`;

const VirtualMachinesPage = () => {
  const [vms, setVms] = useState<VM[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [vmActionLoading, setVmActionLoading] = useState<Record<string, VMAction | null>>({});
  const [vmActionError, setVmActionError] = useState<Record<string, string | null>>({});
  const [isCreateEnvironmentOpen, setIsCreateEnvironmentOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pollIntervalIdsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const pollRequestInFlightRef = useRef<Record<string, boolean>>({});

  const setVmLoadingState = useCallback((vmKey: string, value: VMAction | null) => {
    setVmActionLoading((prev) => ({ ...prev, [vmKey]: value }));
  }, []);

  const setVmErrorState = useCallback((vmKey: string, value: string | null) => {
    setVmActionError((prev) => ({ ...prev, [vmKey]: value }));
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showSuccessToast = useCallback((title: string) => {
    setToasts((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title,
        variant: "success",
      },
    ]);
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

  const handleCreateEnvironmentSuccess = useCallback(async () => {
    await fetchVms();
    showSuccessToast("Dev environment created successfully.");
  }, [fetchVms, showSuccessToast]);

  return (
    <div>
      <PageHeader
        title="Virtual Machines"
        subtitle="Manage VM status and view your Azure inventory in real time."
        actions={
          <button
            type="button"
            onClick={() => setIsCreateEnvironmentOpen(true)}
            className="rounded-xl border border-[#19beaa] bg-[#19beaa] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
          >
            Create Environment
          </button>
        }
      />

      {loading && <p className="text-sm text-slate-500">Loading virtual machines...</p>}

      {error && <p className="text-sm text-rose-600">Error loading virtual machines: {error}</p>}

      {!loading && !error && (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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

      <CreateEnvironmentModal
        isOpen={isCreateEnvironmentOpen}
        onClose={() => setIsCreateEnvironmentOpen(false)}
        onSuccess={handleCreateEnvironmentSuccess}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default VirtualMachinesPage;

import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "../components/shared/PageHeader";
import { Card } from "../components/shared/Card";
import { VMCard, VMSkeletonCard, type VMAction } from "../components/shared/VMCard";
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
const SKELETON_CARD_COUNT = 4;
const MIN_SKELETON_DISPLAY_MS = 1000;

const getVmKey = (vm: Pick<VM, "name" | "resourceGroup">) => `${vm.resourceGroup}-${vm.name}`;

const VirtualMachinesPage = () => {
  const [vms, setVms] = useState<VM[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showEmptyState, setShowEmptyState] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [vmActionLoading, setVmActionLoading] = useState<Record<string, VMAction | null>>({});
  const [vmActionError, setVmActionError] = useState<Record<string, string | null>>({});
  const [isCreateEnvironmentOpen, setIsCreateEnvironmentOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pollIntervalIdsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const pollRequestInFlightRef = useRef<Record<string, boolean>>({});
  const emptyStateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emptyStateDelayResolveRef = useRef<(() => void) | null>(null);
  const loadingRequestIdRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

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
      Object.keys(pollIntervalIdsRef.current).forEach((vmKey) => clearVmPoll(vmKey));
    };
  }, [clearVmPoll, fetchVms]);

  const handleCreateEnvironmentSuccess = useCallback(async () => {
    await fetchVms();
    showSuccessToast("Dev environment created successfully.");
  }, [fetchVms, showSuccessToast]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Virtual Machines"
        subtitle="Manage VM status and view your Azure inventory in real time."
        actions={
          <button
            type="button"
            onClick={() => setIsCreateEnvironmentOpen(true)}
            className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-teal-700"
          >
            Create Environment
          </button>
        }
      />

      {error && <p className="text-sm text-rose-600">Error loading virtual machines: {error}</p>}

      {!error && (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
              <VMSkeletonCard key={`vm-skeleton-${index}`} />
            ))
          ) : vms.length > 0 ? (
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
          ) : showEmptyState ? (
            <Card>
              <p className="text-sm text-gray-500">No virtual machines found.</p>
            </Card>
          ) : (
            Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
              <VMSkeletonCard key={`vm-delayed-empty-${index}`} />
            ))
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

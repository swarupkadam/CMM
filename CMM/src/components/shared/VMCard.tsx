import { clsx } from "clsx";
import { Card } from "./Card";
import type { VM } from "../../types/vm";

const getPowerBadgeClass = (powerState: string) => {
  const normalized = powerState.toLowerCase();

  if (normalized.includes("running")) {
    return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200";
  }

  return "bg-rose-100 text-rose-700 ring-1 ring-rose-200";
};

export type VMAction = "start" | "stop";

type VMCardProps = {
  vm: VM;
  onAction: (vm: VM, action: VMAction) => void;
  loadingAction?: VMAction | null;
  actionError?: string | null;
};

const ButtonSpinner = () => (
  <svg
    className="h-3.5 w-3.5 animate-spin text-white"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-90"
      fill="currentColor"
      d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
    />
  </svg>
);

export const VMCard = ({ vm, onAction, loadingAction = null, actionError = null }: VMCardProps) => {
  const normalizedState = vm.powerState.toLowerCase();
  const isRunning = normalizedState.includes("running");
  const isStopped =
    normalizedState.includes("stopped") || normalizedState.includes("deallocated");
  const isBusy = loadingAction !== null;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-gray-800">{vm.name}</h3>
        <span
          className={clsx(
            "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
            getPowerBadgeClass(vm.powerState)
          )}
        >
          {vm.powerState}
        </span>
      </div>

      <dl className="mt-4 space-y-2 text-sm text-gray-600">
        <div className="flex items-center justify-between gap-3">
          <dt className="font-medium text-gray-500">Resource Group</dt>
          <dd className="text-right font-medium text-gray-600">{vm.resourceGroup}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="font-medium text-gray-500">Location</dt>
          <dd className="text-right font-medium text-gray-600">{vm.location}</dd>
        </div>
      </dl>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onAction(vm, "start")}
          disabled={isBusy || isRunning}
          className={clsx(
            "rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition-colors duration-200 hover:bg-teal-700",
            (isBusy || isRunning) && "cursor-not-allowed opacity-50"
          )}
        >
          {loadingAction === "start" ? (
            <span className="inline-flex items-center gap-2">
              <ButtonSpinner />
              Starting
            </span>
          ) : (
            "Start"
          )}
        </button>

        <button
          type="button"
          onClick={() => onAction(vm, "stop")}
          disabled={isBusy || isStopped}
          className={clsx(
            "rounded-lg bg-rose-500 px-4 py-2 text-xs font-semibold text-white transition-colors duration-200 hover:bg-rose-600",
            (isBusy || isStopped) && "cursor-not-allowed opacity-50"
          )}
        >
          {loadingAction === "stop" ? (
            <span className="inline-flex items-center gap-2">
              <ButtonSpinner />
              Stopping
            </span>
          ) : (
            "Stop"
          )}
        </button>
      </div>

      {actionError && <p className="mt-3 text-xs text-rose-600">{actionError}</p>}
    </Card>
  );
};

export const VMSkeletonCard = () => {
  return (
    <Card>
      <div className="animate-pulse">
        <div className="flex items-start justify-between gap-3">
          <div className="h-5 w-36 rounded bg-gray-200" />
          <div className="h-6 w-20 rounded-full bg-gray-200" />
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="h-4 w-28 rounded bg-gray-200" />
            <div className="h-4 w-28 rounded bg-gray-200" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="h-4 w-20 rounded bg-gray-200" />
            <div className="h-4 w-24 rounded bg-gray-200" />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <div className="h-9 w-20 rounded-lg bg-gray-200" />
          <div className="h-9 w-20 rounded-lg bg-gray-200" />
        </div>
      </div>
    </Card>
  );
};

export const VMCardSkeleton = VMSkeletonCard;

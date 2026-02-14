import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/shared/PageHeader";
import { Card } from "../components/shared/Card";
import type { VM } from "../types/vm";
import { Schedule } from "../data/types";
import { schedules as seededSchedules } from "../data/schedules";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const getVmKey = (vm: VM) => `${vm.resourceGroup}/${vm.name}`;

const SchedulerPage = () => {
  const [vms, setVms] = useState<VM[]>([]);
  const [vmId, setVmId] = useState("");
  const [action, setAction] = useState<"Start" | "Stop">("Start");
  const [time, setTime] = useState("08:00");
  const [days, setDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [schedules, setSchedules] = useState<Schedule[]>(seededSchedules);
  const [message, setMessage] = useState<string | null>(null);
  const [loadingVms, setLoadingVms] = useState<boolean>(true);
  const [vmError, setVmError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchVms = async () => {
      setLoadingVms(true);
      setVmError(null);

      try {
        const response = await fetch("http://localhost:5000/vms", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data: VM[] = await response.json();
        setVms(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }

        const message = err instanceof Error ? err.message : "Failed to fetch virtual machines.";
        setVmError(message);
      } finally {
        setLoadingVms(false);
      }
    };

    fetchVms();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (vmId || vms.length === 0) return;
    setVmId(getVmKey(vms[0]));
  }, [vmId, vms]);

  const vmOptions = useMemo(() => vms.map((vm) => ({ id: getVmKey(vm), name: vm.name })), [vms]);

  const toggleDay = (day: string) => {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const selectedVm = vms.find((vm) => getVmKey(vm) === vmId);
    if (!selectedVm) return;

    const newSchedule: Schedule = {
      id: crypto.randomUUID(),
      vmId,
      vmName: selectedVm.name,
      action,
      time,
      days,
    };

    setSchedules((prev) => [newSchedule, ...prev]);
    setMessage(`Scheduled ${action.toLowerCase()} for ${selectedVm.name}.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scheduler"
        subtitle="Create automation schedules for start and stop actions."
      />
      <Card>
        <form className="grid gap-6 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="space-y-2 text-sm font-semibold text-slate-600">
            Select VM
            <select
              value={vmId}
              onChange={(event) => setVmId(event.target.value)}
              disabled={loadingVms || !!vmError || vmOptions.length === 0}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {vmOptions.map((vm) => (
                <option key={vm.id} value={vm.id}>
                  {vm.name}
                </option>
              ))}
            </select>
            {loadingVms && <p className="text-xs font-normal text-slate-500">Loading Azure VMs...</p>}
            {vmError && <p className="text-xs font-normal text-rose-600">Failed to load VMs: {vmError}</p>}
            {!loadingVms && !vmError && vmOptions.length === 0 && (
              <p className="text-xs font-normal text-slate-500">No Azure VMs available.</p>
            )}
          </label>
          <label className="space-y-2 text-sm font-semibold text-slate-600">
            Action
            <select
              value={action}
              onChange={(event) => setAction(event.target.value as "Start" | "Stop")}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
            >
              <option value="Start">Start</option>
              <option value="Stop">Stop</option>
            </select>
          </label>
          <label className="space-y-2 text-sm font-semibold text-slate-600">
            Time
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
            />
          </label>
          <div className="space-y-2 text-sm font-semibold text-slate-600">
            Days of Week
            <div className="flex flex-wrap gap-2">
              {weekdays.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={
                    days.includes(day)
                      ? "rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                      : "rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500"
                  }
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 md:col-span-2">
            <button
              type="submit"
              disabled={loadingVms || !!vmError || vmOptions.length === 0}
              className="rounded-full bg-slate-900 px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save Schedule
            </button>
            {message && <p className="text-sm text-emerald-600">{message}</p>}
          </div>
        </form>
      </Card>
      <Card>
        <h3 className="text-lg font-semibold text-slate-900">Upcoming Schedules</h3>
        <div className="mt-4 space-y-3">
          {schedules.length === 0 && <p className="text-sm text-slate-400">No schedules yet.</p>}
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {schedule.vmName} - {schedule.action}
                </p>
                <p className="text-xs text-slate-500">
                  {schedule.days.join(", ")} at {schedule.time}
                </p>
              </div>
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                Active
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default SchedulerPage;

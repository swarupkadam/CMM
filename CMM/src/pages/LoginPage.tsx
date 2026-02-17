import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "@/components/Logo";
import { schedules } from "../data/schedules";
import type { VM } from "../types/vm";

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [runningVmCount, setRunningVmCount] = useState<number>(0);
  const scheduleCount = schedules.length;
  const nowLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  useEffect(() => {
    const controller = new AbortController();

    const fetchVms = async () => {
      try {
        const response = await fetch("http://localhost:5000/vms", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data: VM[] = await response.json();
        const runningCount = data.filter((vm) => vm.powerState.toLowerCase().includes("running")).length;
        setRunningVmCount(runningCount);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }

        setRunningVmCount(0);
      }
    };

    fetchVms();

    return () => controller.abort();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    await login(email, password);
    setIsLoading(false);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-12">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
              Azure VM Automation
            </p>
            <h1 className="text-4xl font-semibold leading-tight">
              Cloud Management Module.
            </h1>
            <p className="text-sm text-slate-300">
              Centralize operations, control spend, and align schedules with business
              priorities.
            </p>
            <div className="grid gap-4 rounded-3xl border border-slate-700 bg-slate-900/60 p-6 text-sm text-slate-300">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Next Run</p>
                <p className="text-lg font-semibold text-white">{nowLabel}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-800 p-4">
                  <p className="text-xs text-slate-400">Active Schedules</p>
                  <p className="text-2xl font-semibold text-white">{scheduleCount}</p>
                </div>
                <div className="rounded-2xl bg-slate-800 p-4">
                  <p className="text-xs text-slate-400">Running VMs</p>
                  <p className="text-2xl font-semibold text-white">{runningVmCount}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-3xl bg-white p-8 text-slate-900 shadow-xl">
            <div className="mb-4 flex justify-center">
              <Logo logoClassName="h-20 w-32" titleClassName="text-slate-400" />
            </div>
            <h2 className="relative left-[1ch] text-2xl font-semibold">Welcome</h2>
            <p className="relative left-[2ch] mt-2 text-sm text-slate-500">
              Sign in to manage your Azure virtual machines.
            </p>
            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block space-y-2 text-sm font-semibold text-slate-600">
                <span className="relative left-[2ch]">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-slate-400 focus:outline-none"
                  required
                />
              </label>
              <label className="block space-y-2 text-sm font-semibold text-slate-600">
                <span className="relative left-[2ch]">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="********"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-slate-400 focus:outline-none"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? "Signing in" : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

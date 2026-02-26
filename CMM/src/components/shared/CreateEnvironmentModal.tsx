import { useEffect, useMemo, useState } from "react";

type TemplateType = "dev" | "qa" | "production";

type CreateEnvironmentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (vmName: string) => Promise<void> | void;
};

const TEMPLATE_LABELS: Record<TemplateType, string> = {
  dev: "Dev Environment",
  qa: "QA Environment",
  production: "Production Environment",
};

export const CreateEnvironmentModal = ({
  isOpen,
  onClose,
  onSuccess,
}: CreateEnvironmentModalProps) => {
  const [templateType, setTemplateType] = useState<TemplateType>("dev");
  const [projectName, setProjectName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setTemplateType("dev");
      setProjectName("");
      setIsCreating(false);
      setSubmitError(null);
    }
  }, [isOpen]);

  const normalizedProjectName = useMemo(() => projectName.trim() || "<projectName>", [projectName]);

  const handleCreate = async () => {
    const trimmedProjectName = projectName.trim();

    if (!trimmedProjectName) {
      setSubmitError("Project Name is required.");
      return;
    }

    if (templateType !== "dev") {
      setSubmitError("Only Dev Environment template is available right now.");
      return;
    }

    setSubmitError(null);
    setIsCreating(true);

    try {
      const response = await fetch("http://localhost:5000/template/dev", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectName: trimmedProjectName,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message =
          payload && typeof payload.message === "string"
            ? payload.message
            : "Failed to create environment.";
        throw new Error(message);
      }

      const payload = (await response.json()) as { vmName?: string };
      const vmName = typeof payload.vmName === "string" ? payload.vmName : "";

      await onSuccess(vmName);
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create environment.";
      setSubmitError(message);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl sm:p-7">
        <h3 className="text-xl font-semibold text-gray-800">Create New Environment</h3>

        <div className="mt-6 grid gap-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-600">Template Type</span>
            <select
              value={templateType}
              onChange={(event) => setTemplateType(event.target.value as TemplateType)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors duration-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
            >
              <option value="dev">{TEMPLATE_LABELS.dev}</option>
              <option value="qa" disabled>
                {TEMPLATE_LABELS.qa}
              </option>
              <option value="production" disabled>
                {TEMPLATE_LABELS.production}
              </option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-600">Project Name</span>
            <input
              type="text"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="e.g., billing"
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors duration-200 placeholder:text-gray-500 focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
            />
          </label>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              Configuration Preview
            </p>
            <div className="mt-3 space-y-1.5 text-sm text-gray-600">
              <p>
                <span className="font-medium text-gray-800">Template:</span> Dev
              </p>
              <p>
                <span className="font-medium text-gray-800">VM Size:</span> Standard_B2ats_v2
              </p>
              <p>
                <span className="font-medium text-gray-800">Region:</span> centralindia
              </p>
              <p>
                <span className="font-medium text-gray-800">Public IP:</span> Enabled
              </p>
              <div className="pt-1">
                <p className="font-medium text-gray-800">Tags:</p>
                <p className="pl-3 text-gray-600">- environment=dev</p>
                <p className="pl-3 text-gray-600">- project={normalizedProjectName}</p>
                <p className="pl-3 text-gray-600">- owner=internal-platform</p>
              </div>
            </div>
          </div>

          {submitError && <p className="text-sm text-rose-600">{submitError}</p>}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors duration-200 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isCreating}
            className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isCreating ? (
              <>
                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Creating...
              </>
            ) : (
              "Create Environment"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

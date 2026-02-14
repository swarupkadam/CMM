import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ClientSecretCredential } from "@azure/identity";
import { ComputeManagementClient } from "@azure/arm-compute";

dotenv.config();

const requiredEnvVars = [
  "AZURE_CLIENT_ID",
  "AZURE_CLIENT_SECRET",
  "AZURE_TENANT_ID",
  "AZURE_SUBSCRIPTION_ID"
];

const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(", ")}`);
  process.exit(1);
}

const credential = new ClientSecretCredential(
  process.env.AZURE_TENANT_ID,
  process.env.AZURE_CLIENT_ID,
  process.env.AZURE_CLIENT_SECRET
);

const computeClient = new ComputeManagementClient(
  credential,
  process.env.AZURE_SUBSCRIPTION_ID
);

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

function extractResourceGroupFromId(resourceId) {
  if (!resourceId) return "Unknown";
  const match = resourceId.match(/resourceGroups\/([^/]+)/i);
  return match?.[1] ?? "Unknown";
}

function formatPowerState(statuses = []) {
  const powerStatus = statuses.find((status) =>
    status.code?.toLowerCase().startsWith("powerstate/")
  );

  if (!powerStatus) return "Unknown";

  const fromDisplay = powerStatus.displayStatus?.replace(/^VM\s+/i, "").trim();
  if (fromDisplay) {
    return fromDisplay
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  }

  const fromCode = powerStatus.code?.split("/")[1];
  if (!fromCode) return "Unknown";

  return fromCode.charAt(0).toUpperCase() + fromCode.slice(1).toLowerCase();
}

function getVmInput(body = {}) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const resourceGroup =
    typeof body.resourceGroup === "string" ? body.resourceGroup.trim() : "";

  if (!name || !resourceGroup) {
    return {
      valid: false,
      error: "Both 'name' and 'resourceGroup' are required in request body."
    };
  }

  return { valid: true, name, resourceGroup };
}

app.get("/vms", async (_req, res) => {
  try {
    const vms = [];

    for await (const vm of computeClient.virtualMachines.listAll()) {
      const resourceGroup = extractResourceGroupFromId(vm.id);
      let powerState = "Unknown";

      if (vm.name && resourceGroup !== "Unknown") {
        try {
          const instanceView = await computeClient.virtualMachines.instanceView(
            resourceGroup,
            vm.name
          );
          powerState = formatPowerState(instanceView.statuses);
        } catch (statusError) {
          console.warn(`Could not fetch power state for VM ${vm.name}:`, statusError.message);
        }
      }

      vms.push({
        name: vm.name ?? "Unknown",
        resourceGroup,
        location: vm.location ?? "Unknown",
        powerState
      });
    }

    res.json(vms);
  } catch (error) {
    console.error("Failed to fetch VMs:", error);
    res.status(500).json({
      error: "Failed to fetch virtual machines",
      message: error.message
    });
  }
});

app.post("/vm/start", async (req, res) => {
  const input = getVmInput(req.body);
  if (!input.valid) {
    return res.status(400).json({
      success: false,
      message: input.error
    });
  }

  try {
    await computeClient.virtualMachines.beginStartAndWait(
      input.resourceGroup,
      input.name
    );

    return res.json({
      success: true,
      message: "VM started successfully"
    });
  } catch (error) {
    console.error(
      `Failed to start VM ${input.name} in resource group ${input.resourceGroup}:`,
      error
    );
    return res.status(500).json({
      success: false,
      message: "Failed to start VM",
      error: error.message
    });
  }
});

app.post("/vm/stop", async (req, res) => {
  const input = getVmInput(req.body);
  if (!input.valid) {
    return res.status(400).json({
      success: false,
      message: input.error
    });
  }

  try {
    await computeClient.virtualMachines.beginDeallocateAndWait(
      input.resourceGroup,
      input.name
    );

    return res.json({
      success: true,
      message: "VM stopped successfully"
    });
  } catch (error) {
    console.error(
      `Failed to stop VM ${input.name} in resource group ${input.resourceGroup}:`,
      error
    );
    return res.status(500).json({
      success: false,
      message: "Failed to stop VM",
      error: error.message
    });
  }
});

app.use((err, _req, res, _next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

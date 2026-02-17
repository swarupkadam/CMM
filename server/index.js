import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ClientSecretCredential } from "@azure/identity";
import { ComputeManagementClient } from "@azure/arm-compute";
import { NetworkManagementClient } from "@azure/arm-network";

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

const networkClient = new NetworkManagementClient(
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

function getTemplateDevInput(body = {}) {
  const projectName =
    typeof body.projectName === "string" ? body.projectName.trim() : "";

  if (!projectName) {
    return {
      valid: false,
      error: "Field 'projectName' is required in request body."
    };
  }

  return { valid: true, projectName };
}

function getDevTemplateConfig() {
  const config = {
    resourceGroup: process.env.AZURE_RESOURCE_GROUP,
    location: process.env.AZURE_LOCATION,
    vnetName: process.env.AZURE_VNET_NAME,
    subnetName: process.env.AZURE_SUBNET_NAME,
    adminUsername: process.env.VM_ADMIN_USERNAME,
    adminPassword: process.env.VM_ADMIN_PASSWORD
  };

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  return {
    ...config,
    missing,
    hasMissing: missing.length > 0
  };
}

function sanitizeProjectName(projectName) {
  return projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function buildDevVmName(projectName) {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  const sanitized = sanitizeProjectName(projectName) || "project";
  const maxProjectLength = 45;
  const trimmedProjectName = sanitized.slice(0, maxProjectLength);

  return `dev-${trimmedProjectName}-${timestamp}`;
}

async function createDevTemplateVm(projectName) {
  const config = getDevTemplateConfig();

  if (config.hasMissing) {
    const error = new Error(
      `Missing required environment variables for template: ${config.missing.join(", ")}`
    );
    error.statusCode = 500;
    throw error;
  }

  const vmName = buildDevVmName(projectName);
  const nicName = `${vmName}-nic`;

  const tags = {
    environment: "dev",
    project: projectName,
    owner: "internal-platform"
  };

  const subnet = await networkClient.subnets.get(
    config.resourceGroup,
    config.vnetName,
    config.subnetName
  );

  if (!subnet.id) {
    const error = new Error("Could not resolve subnet ID from configured VNet/subnet.");
    error.statusCode = 500;
    throw error;
  }

  const nic = await networkClient.networkInterfaces.beginCreateOrUpdateAndWait(
    config.resourceGroup,
    nicName,
    {
      location: config.location,
      ipConfigurations: [
        {
          name: "ipconfig1",
          subnet: { id: subnet.id },
          privateIPAllocationMethod: "Dynamic"
        }
      ],
      tags
    }
  );

  if (!nic.id) {
    const error = new Error("NIC creation succeeded but NIC ID was not returned.");
    error.statusCode = 500;
    throw error;
  }

  await computeClient.virtualMachines.beginCreateOrUpdateAndWait(
    config.resourceGroup,
    vmName,
    {
      location: config.location,
      hardwareProfile: {
        vmSize: "Standard_B2ats_v2"
      },
      storageProfile: {
        imageReference: {
          publisher: "Canonical",
          offer: "0001-com-ubuntu-server-jammy",
          sku: "22_04-lts-gen2",
          version: "latest"
        }
      },
      osProfile: {
        computerName: vmName,
        adminUsername: config.adminUsername,
        adminPassword: config.adminPassword,
        linuxConfiguration: {
          disablePasswordAuthentication: false
        }
      },
      networkProfile: {
        networkInterfaces: [{ id: nic.id, primary: true }]
      },
      tags
    }
  );

  return { vmName };
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

app.post("/template/dev", async (req, res) => {
  const input = getTemplateDevInput(req.body);
  if (!input.valid) {
    return res.status(400).json({
      success: false,
      message: input.error
    });
  }

  try {
    const result = await createDevTemplateVm(input.projectName);
    return res.json({
      success: true,
      vmName: result.vmName
    });
  } catch (error) {
    console.error("Failed to create dev template VM:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: "Failed to create dev template VM",
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

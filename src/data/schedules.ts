import { Schedule } from "./types";

export const schedules: Schedule[] = [
  {
    id: "schedule-001",
    vmId: "vm-001",
    vmName: "prod-web-01",
    action: "Start",
    time: "06:00",
    days: ["Mon", "Wed", "Fri"],
  },
  {
    id: "schedule-002",
    vmId: "vm-002",
    vmName: "prod-api-01",
    action: "Start",
    time: "07:30",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  },
  {
    id: "schedule-003",
    vmId: "vm-003",
    vmName: "staging-app-02",
    action: "Stop",
    time: "19:00",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  },
];

export type Schedule = {
  id: string;
  vmId: string;
  vmName: string;
  action: "Start" | "Stop";
  time: string;
  days: string[];
};

import { PageHeader } from "../components/shared/PageHeader";
import { Card } from "../components/shared/Card";
import { activityLogs } from "../data/activityLogs";

const ActivityLogsPage = () => (
  <div className="flex flex-col gap-6">
    <PageHeader
      title="Activity Logs"
      subtitle="Track automation actions performed by users and schedulers."
    />
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-[0.2em] text-gray-500">
          <tr>
            <th className="px-4 py-3">Timestamp</th>
            <th className="px-4 py-3">VM Name</th>
            <th className="px-4 py-3">Action</th>
            <th className="px-4 py-3">Triggered By</th>
          </tr>
        </thead>
        <tbody>
          {activityLogs.map((log) => (
            <tr key={log.id} className="border-b border-gray-100">
              <td className="px-4 py-3 text-gray-600">{log.timestamp}</td>
              <td className="px-4 py-3 font-semibold text-gray-800">{log.vmName}</td>
              <td className="px-4 py-3 text-gray-600">{log.action}</td>
              <td className="px-4 py-3 text-gray-600">{log.triggeredBy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  </div>
);

export default ActivityLogsPage;

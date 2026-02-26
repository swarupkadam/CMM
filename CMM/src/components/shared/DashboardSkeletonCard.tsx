import { Card } from "./Card";

export const DashboardSkeletonCard = () => {
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
      </div>
    </Card>
  );
};

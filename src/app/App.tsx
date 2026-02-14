import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import DashboardLayout from "../components/layout/DashboardLayout";
import DashboardPage from "../pages/DashboardPage";
import VirtualMachinesPage from "../pages/VirtualMachinesPage";
import SchedulerPage from "../pages/SchedulerPage";
import ActivityLogsPage from "../pages/ActivityLogsPage";
import { useAuth } from "../context/AuthContext";

const App = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <DashboardLayout />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="virtual-machines" element={<VirtualMachinesPage />} />
        <Route path="scheduler" element={<SchedulerPage />} />
        <Route path="activity-logs" element={<ActivityLogsPage />} />
      </Route>
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />}
      />
    </Routes>
  );
};

export default App;

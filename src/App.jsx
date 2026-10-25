import { Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout.jsx";
import Dashboard from "@/pages/dashboard/index.jsx";
import Analytics from "@/pages/analytics/index.jsx";
import EventLog from "@/pages/event-log/index.jsx";

const App = () => {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="event-log" element={<EventLog />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default App;

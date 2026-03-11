import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import OrdersDashboard from "@/pages/OrdersDashboard";
import OrderDetailPage from "@/pages/OrderDetailPage";
import ProductionDashboard from "@/pages/ProductionDashboard";
import DispatchPage from "@/pages/DispatchPage";
import InstallationPage from "@/pages/InstallationPage";
import ReworkPage from "@/pages/ReworkPage";
import DepartmentQueuePage from "@/pages/DepartmentQueuePage";
import FinancePage from "@/pages/FinancePage";
import SurveyPage from "@/pages/SurveyPage";
import DesignPage from "@/pages/DesignPage";
import StorePage from "@/pages/StorePage";
import ProcurementPage from "@/pages/ProcurementPage";
import SettingsPage from "@/pages/SettingsPage";
import AdminSettingsPage from "@/pages/AdminSettingsPage";
import UserManagementPage from "@/pages/UserManagementPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <LoginPage />;

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/orders" element={<DepartmentQueuePage departmentKey="orders" />} />
        <Route path="/sales" element={<OrdersDashboard />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />
        <Route path="/survey" element={<SurveyPage />} />
        <Route path="/finance" element={<FinancePage />} />
        <Route path="/design" element={<DesignPage />} />
        <Route path="/procurement" element={<ProcurementPage />} />
        <Route path="/production" element={<ProductionDashboard />} />
        <Route path="/quality" element={<DepartmentQueuePage departmentKey="quality" />} />
        <Route path="/dispatch" element={<DispatchPage />} />
        <Route path="/installation" element={<DepartmentQueuePage departmentKey="installation" />} />
        <Route path="/rework" element={<DepartmentQueuePage departmentKey="rework" />} />
        <Route path="/store" element={<StorePage />} />
        <Route path="/settings" element={<SettingsPage />}>
          <Route index element={<AdminSettingsPage />} />
          <Route path="users" element={<UserManagementPage />} />
        </Route>
        {/* Legacy redirects */}
        <Route path="/admin/users" element={<Navigate to="/settings/users" replace />} />
        <Route path="/admin/settings" element={<Navigate to="/settings" replace />} />
        <Route path="/queue/:role" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

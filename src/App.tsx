import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import OperationalDashboard from "@/pages/OperationalDashboard";
import OrdersDashboard from "@/pages/OrdersDashboard";
import OrderDetailPage from "@/pages/OrderDetailPage";
import ProductionDashboard from "@/pages/ProductionDashboard";
import DispatchPage from "@/pages/DispatchPage";
import InstallationPage from "@/pages/InstallationPage";
import ReworkPage from "@/pages/ReworkPage";
import SalesPage from "@/pages/SalesPage";
import FinancePage from "@/pages/FinancePage";
import SurveyPage from "@/pages/SurveyPage";
import DesignPage from "@/pages/DesignPage";
import StorePage from "@/pages/StorePage";
import ProcurementPage from "@/pages/ProcurementPage";
import SettingsPage from "@/pages/SettingsPage";
import GeneralSettingsPage from "@/pages/settings/GeneralSettingsPage";
import MastersSettingsPage from "@/pages/settings/MastersSettingsPage";
import ProductionSettingsPage from "@/pages/settings/ProductionSettingsPage";
import WorkflowRulesPage from "@/pages/settings/WorkflowRulesPage";
import UserManagementPage from "@/pages/UserManagementPage";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );

  if (!user) return <LoginPage />;

  return (
    <AppLayout>
      <Routes>
        {/* Operations Hub is the main dashboard */}
        <Route path="/" element={<OperationalDashboard />} />

        <Route path="/orders" element={<OrdersDashboard />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />

        <Route path="/sales" element={<SalesPage />} />
        <Route path="/survey" element={<SurveyPage />} />
        <Route path="/finance" element={<FinancePage />} />
        <Route path="/design" element={<DesignPage />} />
        <Route path="/procurement" element={<ProcurementPage />} />

        <Route path="/production" element={<ProductionDashboard />} />
        {/* Quality handled inside Production */}

        <Route path="/dispatch" element={<DispatchPage />} />
        <Route path="/installation" element={<InstallationPage />} />
        <Route path="/rework" element={<ReworkPage />} />
        <Route path="/store" element={<StorePage />} />

        <Route path="/settings" element={<SettingsPage />}>
          <Route index element={<GeneralSettingsPage />} />
          <Route path="masters" element={<MastersSettingsPage />} />
          <Route path="production" element={<ProductionSettingsPage />} />
          <Route path="workflow" element={<WorkflowRulesPage />} />
          <Route path="users" element={<UserManagementPage />} />
        </Route>

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
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
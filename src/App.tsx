import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import PushNotificationProvider from "@/components/PushNotificationProvider";

const Index           = React.lazy(() => import("./pages/Index"));
const Login           = React.lazy(() => import("./pages/Login"));
const Register        = React.lazy(() => import("./pages/Register"));
const AdminDashboard  = React.lazy(() => import("./pages/AdminDashboard"));
const StaffDashboard  = React.lazy(() => import("./pages/StaffDashboard"));
const StudentDashboard = React.lazy(() => import("./pages/StudentDashboard"));
const ProfilePage     = React.lazy(() => import("./pages/ProfilePage"));
const SetupAccount    = React.lazy(() => import("./pages/SetupAccount"));
const ForgotPassword  = React.lazy(() => import("./pages/ForgotPassword"));
const ResetPassword   = React.lazy(() => import("./pages/ResetPassword"));
const ContractSign   = React.lazy(() => import("./pages/ContractSign"));
const Onboarding     = React.lazy(() => import("./pages/Onboarding"));
const NotFound          = React.lazy(() => import("./pages/NotFound"));
const StudentProfilePage = React.lazy(() => import("./pages/StudentProfilePage"));

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider defaultTheme="light" storageKey="60jours-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <PushNotificationProvider />
            <Suspense fallback={<div>Chargement...</div>}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/admin" element={<ProtectedRoute requiredRole="super_admin"><AdminDashboard /></ProtectedRoute>} />
                <Route path="/staff" element={<ProtectedRoute requiredRole="staff"><StaffDashboard /></ProtectedRoute>} />
                <Route path="/student" element={<ProtectedRoute requiredRole="student"><StudentDashboard /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="/student/:id" element={<ProtectedRoute requiredRoles={["super_admin", "staff"]}><StudentProfilePage /></ProtectedRoute>} />
                <Route path="/contract-sign" element={<ProtectedRoute><ContractSign /></ProtectedRoute>} />
                <Route path="/onboarding" element={<ProtectedRoute requiredRole="student"><Onboarding /></ProtectedRoute>} />
                <Route path="/setup-account" element={<SetupAccount />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;

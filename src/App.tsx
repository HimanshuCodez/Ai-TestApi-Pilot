import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import LandingPage from "@/pages/landing/LandingPage";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import ProjectsPage from "@/pages/projects/ProjectsPage";
import CreateProjectPage from "@/pages/projects/CreateProjectPage";
import ProjectOverviewPage from "@/pages/projects/ProjectOverviewPage";
import UploadApiPage from "@/pages/upload/UploadApiPage";
import ApiExplorerPage from "@/pages/explorer/ApiExplorerPage";
import AiAnalysisPage from "@/pages/analysis/AiAnalysisPage";
import GeneratedTestsPage from "@/pages/tests/GeneratedTestsPage";
import RunTestsPage from "@/pages/run/RunTestsPage";
import ReportsPage from "@/pages/reports/ReportsPage";
import BugDetailsPage from "@/pages/bugs/BugDetailsPage";
import AiChatPage from "@/pages/chat/AiChatPage";
import NotFoundPage from "@/pages/NotFoundPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/new" element={<CreateProjectPage />} />
        <Route path="projects/:projectId" element={<ProjectOverviewPage />} />
        <Route path="projects/:projectId/upload" element={<UploadApiPage />} />
        <Route path="projects/:projectId/explorer" element={<ApiExplorerPage />} />
        <Route path="projects/:projectId/analysis" element={<AiAnalysisPage />} />
        <Route path="projects/:projectId/tests" element={<GeneratedTestsPage />} />
        <Route path="projects/:projectId/run" element={<RunTestsPage />} />
        <Route path="projects/:projectId/reports" element={<ReportsPage />} />
        <Route path="projects/:projectId/bugs/:bugId" element={<BugDetailsPage />} />
        <Route path="chat" element={<AiChatPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;

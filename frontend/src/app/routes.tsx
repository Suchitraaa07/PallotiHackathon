import { createBrowserRouter } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ImageAnalyzer } from "./components/ImageAnalyzer";
import { MapSection } from "./components/MapSection";
import { ReportIncident } from "./components/ReportIncident";
import { RiskCheck } from "./components/RiskCheck";
import { Result } from "./components/Result";
import { EmergencyContact } from "./components/EmergencyContact";
import { LoginPage } from "./components/auth/LoginPage";
import { SignupPage } from "./components/auth/SignupPage";
import { WaitingApprovalPage } from "./components/auth/WaitingApprovalPage";
import { AccessDeniedPage } from "./components/auth/AccessDeniedPage";
import { UserDashboardPage } from "./components/auth/UserDashboardPage";
import { HospitalDashboardPage } from "./components/auth/HospitalDashboardPage";
import {
  AuthRequiredGuard,
  HospitalRoleGuard,
  UserRoleGuard,
} from "./components/auth/AuthGuards";

export const router = createBrowserRouter([
  { path: "/login", Component: LoginPage },
  { path: "/signup", Component: SignupPage },
  { path: "/waiting-approval", Component: WaitingApprovalPage },
  { path: "/access-denied", Component: AccessDeniedPage },
  {
    Component: AuthRequiredGuard,
    children: [
      {
        Component: UserRoleGuard,
        children: [{ path: "/user-dashboard", Component: UserDashboardPage }],
      },
      {
        Component: HospitalRoleGuard,
        children: [{ path: "/hospital-dashboard", Component: HospitalDashboardPage }],
      },
    ],
  },
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: ImageAnalyzer },
      { path: "map", Component: MapSection },
      { path: "report", Component: ReportIncident },
      { path: "risk-check", Component: RiskCheck},
      { path: "result", Component: Result },
      { path: "emergency", Component: EmergencyContact },
    ],
  },
]);

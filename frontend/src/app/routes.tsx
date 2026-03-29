import { createBrowserRouter } from "react-router-dom";
import { FirstAidGuide } from "./components/FirstAidGuide";
import { Home } from "./components/Home";
import { Hospitals } from "./components/Hospitals";
import { Layout } from "./components/Layout";
import { ImageAnalyzer } from "./components/ImageAnalyzer";
import { MapSection } from "./components/MapSection";
import { ReportIncident } from "./components/ReportIncident";
import { RiskCheck } from "./components/RiskCheck";
import { Result } from "./components/Result";
import { EmergencyContact } from "./components/EmergencyContact";
import { EmergencyFlow } from "./components/EmergencyFlow";
import { LoginPage } from "./components/auth/LoginPage";
import { SignupPage } from "./components/auth/SignupPage";
import { WaitingApprovalPage } from "./components/auth/WaitingApprovalPage";
import { AccessDeniedPage } from "./components/auth/AccessDeniedPage";
import { HospitalPortalPage } from "./components/auth/HospitalPortalPage";
import {
  AuthRequiredGuard,
  HospitalRoleGuard,
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
        Component: HospitalRoleGuard,
        children: [{ path: "/hospital-dashboard", Component: HospitalPortalPage }],
      },
    ],
  },
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "identify", Component: ImageAnalyzer },
      { path: "map", Component: MapSection },
      { path: "report", Component: ReportIncident },
      { path: "risk-check", Component: RiskCheck },
      { path: "first-aid", Component: FirstAidGuide },
      { path: "contacts", Component: EmergencyContact },
      { path: "hospitals", Component: Hospitals },
      { path: "result", Component: Result },
      { path: "emergency", Component: EmergencyFlow },
    ],
  },
]);

import { createBrowserRouter } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ImageAnalyzer } from "./components/ImageAnalyzer";
import { ReportIncident } from "./components/ReportIncident";
import { RiskCheck } from "./components/RiskCheck";
import { Result } from "./components/Result";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: ImageAnalyzer },
      { path: "report", Component: ReportIncident },
      { path: "risk-check", Component: RiskCheck},
      { path: "result", Component: Result },
    ],
  },
]);

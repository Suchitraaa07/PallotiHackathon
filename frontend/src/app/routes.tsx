import { createBrowserRouter } from "react-router-dom";
import { EmergencyContacts } from "./components/EmergencyContacts";
import { EmergencyFlow } from "./components/EmergencyFlow";
import { FirstAidGuide } from "./components/FirstAidGuide";
import { Home } from "./components/Home";
import { Hospitals } from "./components/Hospitals";
import { Layout } from "./components/Layout";
import { ImageAnalyzer } from "./components/ImageAnalyzer";
import { MapSection } from "./components/MapSection";
import { ReportIncident } from "./components/ReportIncident";
import { RiskCheck } from "./components/RiskCheck";
import { Result } from "./components/Result";
import { SnakeFlashcards } from "./components/SnakeFlashcards";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "identify", Component: ImageAnalyzer },
      { path: "map", Component: MapSection },
      { path: "emergency", Component: EmergencyFlow },
      { path: "report", Component: ReportIncident },
      { path: "risk-check", Component: RiskCheck },
      { path: "flashcards", Component: SnakeFlashcards },
      { path: "first-aid", Component: FirstAidGuide },
      { path: "contacts", Component: EmergencyContacts },
      { path: "hospitals", Component: Hospitals },
      { path: "result", Component: Result },
    ],
  },
]);

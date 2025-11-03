// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import EnginePropulsion from "./pages/EnginePropulsion";
import SuctionSystem from "./pages/SuctionSystem";
import PredictiveAnalysis from "./pages/PredictiveAnalysis";
import UploadDocument from "./pages/UploadDocument";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/engine-propulsion" element={<EnginePropulsion />} />
        <Route path="/suction-system" element={<SuctionSystem />} />
        <Route path="/predictive" element={<PredictiveAnalysis />} />
        <Route path="/upload" element={<UploadDocument />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
}
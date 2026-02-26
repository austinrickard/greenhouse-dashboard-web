import { Routes, Route } from "react-router-dom";
import { useData } from "./hooks/useData";
import { FilterProvider } from "./context/FilterContext";
import Sidebar from "./components/Sidebar";
import Overview from "./pages/Overview";
import Pipeline from "./pages/Pipeline";
import TimeToHire from "./pages/TimeToHire";
import OpenReqs from "./pages/OpenReqs";
import HiresSource from "./pages/HiresSource";

export default function App() {
  const data = useData();

  if (data.loading) {
    return (
      <div className="loading-screen">
        <h2>Loading dashboard data...</h2>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="loading-screen">
        <h2>Error loading data</h2>
        <p>{data.error}</p>
      </div>
    );
  }

  return (
    <FilterProvider data={data}>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/time-to-hire" element={<TimeToHire />} />
            <Route path="/open-reqs" element={<OpenReqs />} />
            <Route path="/hires-source" element={<HiresSource />} />
          </Routes>
        </main>
      </div>
    </FilterProvider>
  );
}

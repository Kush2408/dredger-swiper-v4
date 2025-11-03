
import Sidebar from "../components/Sidebar";

export default function Settings() {
  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: "radial-gradient(circle at center, #0a192f 0%, #020a15 100%)" }}>
      <Sidebar />
      <div className="flex-1 p-6 text-gray-300">
        <h1 className="text-2xl font-bold mb-4">Settings</h1>
        <p>Coming soon.</p>
      </div>
    </div>
  );
}
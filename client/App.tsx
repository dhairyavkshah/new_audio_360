import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Music, Library, Settings, Play, SkipBack, SkipForward } from "lucide-react";
import { useState } from "react";

const queryClient = new QueryClient();

function MobileApp() {
  const [activeTab, setActiveTab] = useState<"listen" | "library" | "settings">("listen");

  return (
    <div className="h-full w-full max-w-md mx-auto bg-black flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {activeTab === "listen" && <ListenScreen />}
        {activeTab === "library" && <LibraryScreen />}
        {activeTab === "settings" && <SettingsScreen />}
      </div>

      <MiniPlayer />

      <nav className="flex items-center justify-around bg-gray-900/90 backdrop-blur-xl border-t border-white/10 py-3 px-4">
        <TabButton 
          icon={<Music size={24} />} 
          label="Listen" 
          active={activeTab === "listen"} 
          onClick={() => setActiveTab("listen")} 
        />
        <TabButton 
          icon={<Library size={24} />} 
          label="Library" 
          active={activeTab === "library"} 
          onClick={() => setActiveTab("library")} 
        />
        <TabButton 
          icon={<Settings size={24} />} 
          label="Settings" 
          active={activeTab === "settings"} 
          onClick={() => setActiveTab("settings")} 
        />
      </nav>
    </div>
  );
}

function TabButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-4 py-1 transition-colors ${active ? "text-sky-400" : "text-gray-500"}`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function ListenScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-8">
      <div className="w-64 h-64 bg-gradient-to-br from-sky-500/30 to-purple-600/30 rounded-3xl flex items-center justify-center mb-8 border border-white/10">
        <Music size={80} className="text-white/50" />
      </div>
      <h2 className="text-xl font-semibold text-white mb-1">No Song Playing</h2>
      <p className="text-gray-500 text-sm mb-8">Select a song from your library</p>
      
      <div className="flex items-center gap-8">
        <button className="text-white/60 hover:text-white transition-colors">
          <SkipBack size={32} />
        </button>
        <button className="w-16 h-16 rounded-full bg-sky-500 flex items-center justify-center hover:bg-sky-400 transition-colors">
          <Play size={28} className="text-white ml-1" />
        </button>
        <button className="text-white/60 hover:text-white transition-colors">
          <SkipForward size={32} />
        </button>
      </div>
    </div>
  );
}

function LibraryScreen() {
  const categories = ["Songs", "Albums", "Artists", "Playlists", "Liked Songs", "Recently Played"];
  
  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold text-white mb-6">Library</h1>
      <div className="space-y-2">
        {categories.map((category) => (
          <button 
            key={category}
            className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-sky-500/50 to-purple-500/50 rounded-lg flex items-center justify-center">
              <Music size={20} className="text-white" />
            </div>
            <span className="text-white font-medium">{category}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingsScreen() {
  const settings = ["General", "Sound Lab", "Appearance", "Support Developer", "About"];
  
  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>
      <div className="space-y-2">
        {settings.map((setting) => (
          <button 
            key={setting}
            className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
          >
            <span className="text-white font-medium">{setting}</span>
            <span className="text-gray-500">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MiniPlayer() {
  return (
    <div className="mx-3 mb-2 p-3 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center gap-3">
      <div className="w-12 h-12 bg-gradient-to-br from-sky-500/50 to-purple-500/50 rounded-lg flex items-center justify-center">
        <Music size={20} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">No song playing</p>
        <p className="text-gray-500 text-xs truncate">Tap to select music</p>
      </div>
      <button className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center">
        <Play size={18} className="text-white ml-0.5" />
      </button>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<MobileApp />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-6">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-white">New Audio 360</h1>
        <p className="text-gray-400 text-lg max-w-md">
          Premium offline music player - 100% device-local
        </p>
        <div className="flex flex-col gap-4 mt-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-2">Listen</h2>
            <p className="text-gray-400">Play your local music files</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-2">Library</h2>
            <p className="text-gray-400">Organize songs, albums, playlists</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-2">Sound Lab</h2>
            <p className="text-gray-400">Equalizer and audio effects</p>
          </div>
        </div>
        <p className="text-gray-500 text-sm mt-8">
          Build for Android/iOS via GitHub Actions
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

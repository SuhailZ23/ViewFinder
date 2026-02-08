import React, { useState, useEffect } from 'react';

// --- CONFIG ---
// ✅ REMOVED: const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
// Why: "http://backend:8000" is a Docker-internal hostname — your BROWSER can't reach it.
// Fix: All requests now use a relative path like "/api/analyze".
//      Vite's dev-server proxy (in vite.config.js) forwards /api/* → http://backend:8000
//      This works both inside Docker AND when running locally.

// --- MOCK DATA FOR BACKGROUND ---
const BACKGROUND_IMAGES = [
  "https://images.unsplash.com/photo-1548013146-72479768bada?w=400&q=60",
  "https://images.unsplash.com/photo-1548296404-93c7694b2f91?w=400&q=60",
  "https://images.unsplash.com/photo-1526725702345-bdda2b97ef73?w=400&q=60",
  "https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=400&q=60",
  "https://images.unsplash.com/photo-1565060852924-764835d00f72?w=400&q=60",
  "https://images.unsplash.com/photo-1597659840241-37e2b9c2f55f?w=400&q=60",
  "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&q=60",
  "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&q=60",
  "https://images.unsplash.com/photo-1518558997970-4ddc236affcd?w=400&q=60",
  "https://images.unsplash.com/photo-1599571343714-3d9646b97621?w=400&q=60",
  "https://images.unsplash.com/photo-1506163356061-067982f64603?w=400&q=60",
  "https://images.unsplash.com/photo-1568288591522-d748809e6c64?w=400&q=60"
];

const App = () => {
  const [view, setView] = useState('home'); // home | scanning | results
  const [selectedImg, setSelectedImg] = useState(null);
  const [results, setResults] = useState([]);
  const [demoImages, setDemoImages] = useState([]);

  // --- RANDOMIZER LOGIC (Runs once on load) ---
  useEffect(() => {
    const shuffled = [...BACKGROUND_IMAGES].sort(() => 0.5 - Math.random());
    setDemoImages(shuffled.slice(0, 6));
  }, []);

  // --- UPLOAD HANDLER ---
  const handleUpload = async (file) => {
    if (!file) return;

    // 1. Preview
    const previewUrl = URL.createObjectURL(file);
    setSelectedImg(previewUrl);
    setView('scanning');

    // 2. Prepare FormData
    const formData = new FormData();
    formData.append('file', file);

    try {
      // 3. Send to backend via Vite proxy — relative URL, no hostname needed
      const response = await fetch('/api/analyze', {   // ← CHANGED from `${API_URL}/analyze`
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.results) {
        // Prepend /api to each result's image path so it also routes through the proxy
        // e.g. "/static/Eiffel_Tower/img.jpg" → "/api/static/Eiffel_Tower/img.jpg"
        const fixedResults = data.results.map(item => ({
          ...item,
          image: item.image.startsWith('http') ? item.image : `/api${item.image}`
        }));
        setResults(fixedResults);
        setTimeout(() => setView('results'), 2500);
      }
    } catch (error) {
      console.error("API Error:", error);
      alert("Could not connect to ViewFinder Brain. Is Docker running?");
      setView('home');
    }
  };

  // --- UI COMPONENTS ---

  const InfiniteWall = () => (
    <div className="fixed inset-0 z-0 bg-black pointer-events-none">
       <div className="absolute inset-0 bg-black/80 z-10"></div>
       <div className="grid grid-cols-3 gap-4 w-[120vw] -ml-[10vw] opacity-40">
          {[80, 60, 90].map((speed, colIndex) => (
             <div key={colIndex} className="flex flex-col gap-4" style={{
               animation: `scrollUp ${speed}s linear infinite`,
               marginTop: colIndex === 1 ? '-200px' : '0'
             }}>
                {[...BACKGROUND_IMAGES, ...BACKGROUND_IMAGES].map((src, i) => (
                   <img key={i} src={src} className="w-full rounded-lg object-cover h-64 grayscale" />
                ))}
             </div>
          ))}
       </div>
       <style>{`
         @keyframes scrollUp { 0% { transform: translateY(0); } 100% { transform: translateY(-50%); } }
       `}</style>
    </div>
  );

  return (
    <div className="min-h-screen text-white font-sans overflow-x-hidden selection:bg-teal-500 selection:text-black">
      <InfiniteWall />

      {/* NAVBAR */}
      <nav className="fixed top-0 w-full p-6 flex justify-between items-center z-50 mix-blend-difference">
        <div className="text-2xl font-bold tracking-tight">ViewFinder<span className="text-teal-400">.</span></div>
        <div className="text-xs tracking-widest uppercase opacity-70 hidden md:block">Visual Intelligence</div>
      </nav>

      {/* VIEW: HOME */}
      {view === 'home' && (
        <div className="relative z-10 flex flex-col md:flex-row h-screen pt-20">

          {/* LEFT: UPLOAD */}
          <div className="w-full md:w-1/2 flex items-center justify-center p-8 border-r border-white/10 glass-panel hover:bg-white/5 transition-colors cursor-pointer group"
               onClick={() => document.getElementById('fileInput').click()}>
             <div className="text-center">
                <div className="w-20 h-20 rounded-full border border-white/20 flex items-center justify-center mx-auto mb-6 group-hover:border-teal-400 group-hover:text-teal-400 transition-all">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                </div>
                <h1 className="text-5xl font-bold mb-4 italic font-serif">Upload</h1>
                <p className="text-slate-400 text-sm">Find the architectural twin of your photo.</p>
                <input type="file" id="fileInput" className="hidden" accept="image/*" onChange={(e) => handleUpload(e.target.files[0])} />
             </div>
          </div>

          {/* RIGHT: DEMO GRID */}
          <div className="w-full md:w-1/2 flex items-center justify-center p-8">
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-lg">
                {demoImages.map((img, i) => (
                   <div key={i} className="aspect-square bg-white/10 rounded-lg overflow-hidden relative cursor-pointer hover:scale-105 transition-transform border border-white/10"
                        onClick={() => { setSelectedImg(img); setView('scanning'); setTimeout(() => setView('results'), 3000); }}>
                      <img src={img} className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
                   </div>
                ))}
             </div>
          </div>

        </div>
      )}

      {/* VIEW: SCANNING */}
      {view === 'scanning' && (
        <div className="relative z-10 h-screen flex flex-col items-center justify-center">
           <div className="relative w-64 h-64 rounded-xl overflow-hidden border border-teal-500/50 shadow-[0_0_50px_rgba(45,212,191,0.3)]">
              <img src={selectedImg} className="w-full h-full object-cover opacity-60 grayscale" />
              <div className="absolute inset-0 bg-teal-500/10"></div>
              <div className="absolute w-full h-1 bg-teal-400 shadow-[0_0_20px_#2dd4bf] animate-[scan_2s_infinite]"></div>
           </div>
           <p className="mt-8 font-mono text-teal-400 text-sm animate-pulse">ANALYZING GEOMETRY VECTORS...</p>
           <style>{`@keyframes scan { 0% { top: 0%; } 50% { top: 100%; } 100% { top: 0%; } }`}</style>
        </div>
      )}

      {/* VIEW: RESULTS */}
      {view === 'results' && (
        <div className="relative z-10 min-h-screen pt-24 px-6 md:px-12 max-w-7xl mx-auto">
           <button onClick={() => setView('home')} className="mb-8 text-slate-400 hover:text-white uppercase tracking-widest text-xs flex items-center gap-2">
             ← Try Another
           </button>

           <h2 className="text-4xl md:text-5xl font-serif italic mb-12">Visual Matches</h2>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-20">
              {results.length > 0 ? results.map((item) => (
                 <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:-translate-y-2 transition-transform duration-500 group">
                    <div className="h-64 overflow-hidden relative">
                       <img src={item.image} onError={(e) => e.target.src = "https://via.placeholder.com/400"} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                       <div className="absolute top-4 right-4 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs font-bold border border-white/20">
                          {item.similarity}% Match
                       </div>
                    </div>
                    <div className="p-6">
                       <h3 className="text-xl font-bold mb-1">{item.name}</h3>
                       <p className="text-slate-400 text-xs mb-4 uppercase tracking-widest">{item.matchType}</p>
                       <div className="inline-block px-3 py-1 rounded-full border border-teal-500/20 text-xs bg-teal-500/10 text-teal-300">
                          {item.matchReason}
                       </div>
                    </div>
                 </div>
              )) : (
                 <div className="col-span-3 text-center text-slate-500 py-20">No matches found (or Backend Mock Data missing).</div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
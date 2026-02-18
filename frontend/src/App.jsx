import React, { useState, useEffect } from 'react';

const App = () => {
  const [view, setView] = useState('home'); // home | scanning | results
  const [selectedImg, setSelectedImg] = useState(null);
  const [results, setResults] = useState([]);
  const [selectedCount, setSelectedCount] = useState(3); // Progress: 3/5 images selected
  const [demoImages, setDemoImages] = useState([]);
  const [allImages, setAllImages] = useState([]);

  // Demo image pool (these will cycle as user clicks them)
  const IMAGE_POOL = [
    "https://images.unsplash.com/photo-1548013146-72479768bada?w=400&q=80", // Acropolis
    "https://images.unsplash.com/photo-1548296404-93c7694b2f91?w=400&q=80", // Atomium
    "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400&q=80", // Arc de Triomphe
    "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&q=80", // Big Ben
    "https://images.unsplash.com/photo-1526725702345-bdda2b97ef73?w=400&q=80",
    "https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=400&q=60",
    "https://images.unsplash.com/photo-1565060852924-764835d00f72?w=400&q=60",
    "https://images.unsplash.com/photo-1597659840241-37e2b9c2f55f?w=400&q=60",
    "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&q=60",
    "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&q=60",
    "https://images.unsplash.com/photo-1518558997970-4ddc236affcd?w=400&q=60",
    "https://images.unsplash.com/photo-1599571343714-3d9646b97621?w=400&q=60",
  ];

  // Initialize with first 4 images
  useEffect(() => {
    const shuffled = [...IMAGE_POOL].sort(() => 0.5 - Math.random());
    setAllImages(shuffled);
    setDemoImages(shuffled.slice(0, 4));
  }, []);

  // Handle file upload
  const handleUpload = async (file) => {
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setSelectedImg(previewUrl);
    setView('scanning');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.results) {
        const fixedResults = data.results.map(item => ({
          ...item,
          image: item.image.startsWith('http') ? item.image : `/api${item.image}`
        }));
        setResults(fixedResults);
        setTimeout(() => setView('results'), 2500);
      }
    } catch (error) {
      console.error("API Error:", error);
      alert("Could not connect to ViewFinder. Is Docker running?");
      setView('home');
    }
  };

  // Handle demo image click (reCAPTCHA-style rotation)
  const handleDemoClick = (clickedImg, index) => {
    // Run analysis on this image
    setSelectedImg(clickedImg);
    setView('scanning');
    
    // Mock results for demo clicks
    setTimeout(() => {
      setResults([
        { id: 1, name: "Eiffel Tower", similarity: 92.5, matchType: "visual", matchReason: "Engineering Marvels | Urban", image: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=400&q=80" },
        { id: 2, name: "Big Ben", similarity: 88.3, matchType: "structural", matchReason: "Engineering Marvels | Waterfront", image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&q=80" },
        { id: 3, name: "Statue of Liberty", similarity: 85.1, matchType: "visual", matchReason: "Monuments | Waterfront", image: "https://images.unsplash.com/photo-1569098644584-210bcd375b59?w=400&q=80" },
      ]);
      setView('results');
    }, 2500);

    // Increment progress
    if (selectedCount < 5) {
      setSelectedCount(prev => prev + 1);
    } else {
      setSelectedCount(1); // Reset after 5
    }

    // Replace clicked image with next from pool (reCAPTCHA style)
    const nextImageIndex = allImages.findIndex(img => !demoImages.includes(img));
    if (nextImageIndex !== -1) {
      const newDemos = [...demoImages];
      newDemos[index] = allImages[nextImageIndex];
      setDemoImages(newDemos);
    }
  };

  // Background images for scrolling grid - 3 unique columns
  const BG_COL_1 = [
    "https://images.unsplash.com/photo-1548013146-72479768bada?w=400&q=60", // Acropolis
    "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=400&q=60", // Eiffel
    "https://images.unsplash.com/photo-1526725702345-bdda2b97ef73?w=400&q=60",
    "https://images.unsplash.com/photo-1565060852924-764835d00f72?w=400&q=60",
    "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&q=60",
    "https://images.unsplash.com/photo-1506163356061-067982f64603?w=400&q=60",
    "https://images.unsplash.com/photo-1590736969955-71cc94901144?w=400&q=60",
    "https://images.unsplash.com/photo-1555881604-6656e2731b55?w=400&q=60",
    "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&q=60",
    "https://images.unsplash.com/photo-1520986606214-8b456906c813?w=400&q=60",
  ];
  
  const BG_COL_2 = [
    "https://images.unsplash.com/photo-1548296404-93c7694b2f91?w=400&q=60", // Atomium
    "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&q=60", // Big Ben
    "https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=400&q=60",
    "https://images.unsplash.com/photo-1597659840241-37e2b9c2f55f?w=400&q=60",
    "https://images.unsplash.com/photo-1518558997970-4ddc236affcd?w=400&q=60",
    "https://images.unsplash.com/photo-1568288591522-d748809e6c64?w=400&q=60",
    "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=400&q=60",
    "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400&q=60",
    "https://images.unsplash.com/photo-1549144511-f099e773c147?w=400&q=60",
    "https://images.unsplash.com/photo-1524338198850-8a2ff63aaceb?w=400&q=60",
  ];
  
  const BG_COL_3 = [
    "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400&q=60", // Arc de Triomphe
    "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&q=60",
    "https://images.unsplash.com/photo-1599571343714-3d9646b97621?w=400&q=60",
    "https://images.unsplash.com/photo-1569098644584-210bcd375b59?w=400&q=60",
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&q=60",
    "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&q=60",
    "https://images.unsplash.com/photo-1558030006-450675393462?w=400&q=60",
    "https://images.unsplash.com/photo-1564594143664-c5e2b0c6b570?w=400&q=60",
    "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=400&q=60",
    "https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=400&q=60",
  ];

  const BG_COLUMNS = [BG_COL_1, BG_COL_2, BG_COL_3];

  return (
    <div className="min-h-screen bg-black text-white font-sans relative overflow-hidden">
      {/* ANIMATED BACKGROUND GRID - 3 Columns with Infinite Loop */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-black/70 z-10"></div>
        <div className="grid grid-cols-3 gap-0 w-full opacity-100">
          {BG_COLUMNS.map((column, colIndex) => (
            <div 
              key={colIndex} 
              className="flex flex-col gap-0" 
              style={{
                animation: `scrollDown ${85 + colIndex * 10}s linear infinite`,
              }}
            >
              {/* Double the images to create seamless infinite loop */}
              {[...column, ...column].map((src, i) => (
                <img 
                  key={i} 
                  src={src} 
                  className="w-full object-cover h-64 grayscale brightness-50" 
                  alt=""
                />
              ))}
            </div>
          ))}
        </div>
        <style>{`
          @keyframes scrollDown {
            0% { transform: translateY(0); }
            100% { transform: translateY(-50%); }
          }
        `}</style>
      </div>

      {/* OUTER WHITE BORDER FRAME */}
      <div className="fixed inset-0 pointer-events-none z-50">
        <div className="absolute inset-0 border-2 border-white/20"></div>
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-10 min-h-screen p-4 md:p-8">

        {/* VIEW: HOME */}
        {view === 'home' && (
          <div className="flex flex-col items-center justify-center min-h-screen max-w-md mx-auto">
            
            {/* LOGO */}
            <div className="mb-12">
              <LogoSVG />
            </div>

            {/* UPLOAD AREA - Small Semi-transparent Box */}
            <div className="w-full flex flex-col items-center justify-center bg-white/[0.04] rounded-3xl p-8 mb-8 backdrop-blur-sm border border-white/10">
              <div 
                className="cursor-pointer hover:scale-105 transition-transform"
                onClick={() => document.getElementById('fileInput').click()}
              >
                <UploadButtonSVG />
                <input 
                  type="file" 
                  id="fileInput" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={(e) => handleUpload(e.target.files[0])} 
                />
              </div>
            </div>

            {/* ARABIC TEXT: "أو" (OR) */}
            <div className="text-4xl font-bold mb-6">
              أو
            </div>

            {/* SUGGESTIONS AREA - Large Semi-transparent Box */}
            <div className="bg-white/[0.04] rounded-3xl p-8 backdrop-blur-sm border border-white/10 w-full">
              {/* ARABIC TEXT: "إختار وين ودك تسافر؟" */}
              <div className="text-center mb-4">
                <p className="text-xl font-bold mb-1">
                  :اخترأكثر منظر يعجبك
                </p>
                <p className="text-sm text-white/60 font-bold">
                  :اختر 5 أماكن أو أكثر لنتيجة أفضل {selectedCount}/5
                </p>
              </div>

              {/* PROGRESS BAR - Single Container with Green Boxes Filling In */}
              <div className="w-full max-w-xs mb-8 mx-auto">
                <div className="h-12 bg-transparent rounded-2xl border-2 border-white p-1 flex gap-1">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <div
                      key={num}
                      className={`flex-1 rounded-xl transition-all duration-300 ${
                        num <= selectedCount ? 'bg-[#009951]' : 'bg-transparent'
                      }`}
                    ></div>
                  ))}
                </div>
              </div>

              {/* DEMO IMAGE GRID (4 images, 2x2) */}
              <div className="grid grid-cols-2 gap-4 w-full">
                {demoImages.map((img, i) => (
                  <div
                    key={i}
                    className="aspect-square bg-white/5 rounded-3xl overflow-hidden border-4 border-white/80 cursor-pointer hover:scale-105 hover:border-[#FB7252] transition-all duration-300 shadow-lg"
                    onClick={() => handleDemoClick(img, i)}
                  >
                    <img 
                      src={img} 
                      className="w-full h-full object-cover" 
                      alt={`Destination ${i + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* VIEW: SCANNING */}
        {view === 'scanning' && (
          <div className="flex flex-col items-center justify-center min-h-screen">
            <div className="relative w-72 h-72 rounded-2xl overflow-hidden border-2 border-[#FB7252]/50 shadow-[0_0_60px_rgba(251,114,82,0.4)]">
              <img src={selectedImg} className="w-full h-full object-cover opacity-50 grayscale" alt="Analyzing" />
              <div className="absolute inset-0 bg-[#FB7252]/5"></div>
              <div className="absolute w-full h-1 bg-[#FB7252] shadow-[0_0_25px_#FB7252] animate-[scan_2.5s_ease-in-out_infinite]"></div>
            </div>
            <p className="mt-10 font-mono text-[#FB7252] text-sm animate-pulse tracking-widest">
              ANALYZING IMAGE...
            </p>
            <style>{`
              @keyframes scan {
                0%, 100% { top: 0%; opacity: 1; }
                50% { top: 100%; opacity: 0.8; }
              }
            `}</style>
          </div>
        )}

        {/* VIEW: RESULTS */}
        {view === 'results' && (
          <div className="min-h-screen pt-24 px-6 md:px-12 max-w-6xl mx-auto">
            <button 
              onClick={() => setView('home')} 
              className="mb-8 text-white/60 hover:text-white uppercase tracking-widest text-xs flex items-center gap-2 transition-colors"
            >
              ← BACK
            </button>

            <h2 className="text-4xl md:text-5xl font-bold mb-12 text-[#FB7252]">
              Your Matches
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-20">
              {results.length > 0 ? results.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:-translate-y-2 hover:border-[#FB7252]/50 transition-all duration-500 group"
                >
                  <div className="h-64 overflow-hidden relative">
                    <img 
                      src={item.image} 
                      onError={(e) => e.target.src = "https://via.placeholder.com/400"} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                      alt={item.name}
                    />
                    <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold border border-[#FB7252]/30">
                      {item.similarity}% Match
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-1">{item.name}</h3>
                    <p className="text-white/50 text-xs mb-4 uppercase tracking-widest">{item.matchType}</p>
                    <div className="inline-block px-3 py-1.5 rounded-full border border-[#FB7252]/30 text-xs bg-[#FB7252]/10 text-[#FB7252]">
                      {item.matchReason}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="col-span-3 text-center text-white/40 py-20">No matches found.</div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// PLACEHOLDER: ViewFinder Logo SVG
const LogoSVG = () => (
  <svg width="280" height="80" viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <text 
      x="140" 
      y="50" 
      fontFamily="'Baloo Bhaijaan 2', system-ui, sans-serif" 
      fontSize="48" 
      fontWeight="700" 
      fill="#FB7252" 
      textAnchor="middle"
      letterSpacing="2"
    >
      ViewFinder
    </text>
  </svg>
);

// PLACEHOLDER: Upload Button SVG (with embedded Arabic text)
const UploadButtonSVG = () => (
  <svg width="200" height="140" viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Upload Icon Circle */}
    <circle cx="100" cy="60" r="35" stroke="white" strokeWidth="2" fill="none" opacity="0.4" />
    
    {/* Upload Arrow */}
    <g transform="translate(100, 60)">
      <path 
        d="M0,-15 L0,15 M-10,-5 L0,-15 L10,-5" 
        stroke="#FB7252" 
        strokeWidth="3" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        fill="none"
      />
    </g>

    {/* Arabic Text: "إرفق صورة" */}
    <text 
      x="100" 
      y="115" 
      fontFamily="'Baloo Bhaijaan 2', Arial, sans-serif" 
      fontSize="20" 
      fontWeight="700" 
      fill="white" 
      textAnchor="middle"
    >
      إرفق صورة
    </text>
  </svg>
);

export default App;
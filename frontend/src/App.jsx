import React, { useState, useEffect } from 'react';

const App = () => {
  const [view, setView] = useState('home'); // home | scanning | results
  const [selectedImages, setSelectedImages] = useState([]); // Array of selected image URLs/files
  const [results, setResults] = useState([]);
  const [selectedCount, setSelectedCount] = useState(0); // Progress: starts at 0/5
  const [demoImages, setDemoImages] = useState([]);
  const [allImages, setAllImages] = useState([]);
  const [fadingOut, setFadingOut] = useState(null); // Track which image is fading out

  // Background images for scrolling grid: 3 unique columns
  // [X] Replace these placeholder URLs with your 20 hand-picked dataset images
  // Format: "/api/static/Landmark_Name/image.jpg"
  const BG_COL_1 = [
    "/images/1.jpg",
    "/images/2.jpg",
    "/images/3.jpg",
    "/images/4.jpg",
    "/images/5.jpg",
    "/images/6.jpg",
    "/images/7.jpg",
    "/images/8.jpg",
  ];
  
  const BG_COL_2 = [
    "/images/9.jpg",
    "/images/10.jpg",
    "/images/11.jpg",
    "/images/12.jpg",
    "/images/13.jpg",
    "/images/14.jpg",
    "/images/15.jpg",
    "/images/16.jpg",
  ];
  
  const BG_COL_3 = [
    "/images/17.jpg",
    "/images/18.jpg",
    "/images/19.jpg",
    "/images/20.jpg",
    "/images/21.jpg",
    "/images/22.jpg",
    "/images/23.jpg",
    "/images/24.jpg",
  ];

  const BG_COLUMNS = [BG_COL_1, BG_COL_2, BG_COL_3];

  // Fetch random demo images from backend on component mount
  useEffect(() => {
    const fetchDemoImages = async () => {
      try {
        const response = await fetch('/api/random_images?count=12');
        const data = await response.json();
        
        if (data.images && data.images.length > 0) {
          // Images are already in correct format: "/images/1.jpg"
          // NO need to prepend /api since they're served from frontend public folder
          setAllImages(data.images);
          setDemoImages(data.images.slice(0, 4));
        } else {
          // Fallback to placeholders if backend fails
          console.warn("No images from backend, using placeholders");
          useFallbackImages();
        }
      } catch (error) {
        console.error("Error fetching demo images:", error);
        useFallbackImages();
      }
    };

    const useFallbackImages = () => {
      const fallback = [
        "/images/1.jpg",
        "/images/2.jpg",
        "/images/3.jpg",
        "/images/4.jpg",
      ];
      setAllImages(fallback);
      setDemoImages(fallback.slice(0, 4));
    };

    fetchDemoImages();
  }, []);

  // Handle file upload
  const handleUpload = async (file) => {
    if (!file) return;

    // Add to selected images array
    const newSelected = [...selectedImages, file];
    setSelectedImages(newSelected);
    setSelectedCount(newSelected.length);

    // If we've collected 5 images, analyze them
    if (newSelected.length >= 5) {
      await analyzeMultipleImages(newSelected);
    }
  };

  // Analyze multiple images
  const analyzeMultipleImages = async (images) => {
    setView('scanning');

    const formData = new FormData();
    
    // Add all images to FormData (handle both File objects and URLs)
    for (let i = 0; i < images.length; i++) {
      if (images[i] instanceof File) {
        formData.append('files', images[i]);
      } else {
        // For demo images (URLs), we need to fetch and convert to blob
        try {
          const response = await fetch(images[i]);
          const blob = await response.blob();
          formData.append('files', blob, `demo_${i}.jpg`);
        } catch (error) {
          console.error("Error fetching demo image:", error);
        }
      }
    }

    try {
      const response = await fetch('/api/analyze_multiple', {
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
      // Reset on error
      setSelectedImages([]);
      setSelectedCount(0);
    }
  };

  // Handle demo image click with fade-out
  const handleDemoClick = async (clickedImg, index) => {
    // Start fade-out animation
    setFadingOut(index);

    // Add to selected images
    const newSelected = [...selectedImages, clickedImg];
    setSelectedImages(newSelected);
    setSelectedCount(newSelected.length);

    // Wait for fade animation, then replace image
    // Wait for fade animation, then replace image
    setTimeout(() => {
      setDemoImages(prevDemos => {
        // 1. Find images from allImages that are NOT on screen AND NOT already selected
        const availableImages = allImages.filter(
          img => !prevDemos.includes(img) && !newSelected.includes(img)
        );

        if (availableImages.length > 0) {
          // 2. Pick a RANDOM image from the fresh ones instead of just the first one
          const randomIndex = Math.floor(Math.random() * availableImages.length);
          const newDemos = [...prevDemos];
          newDemos[index] = availableImages[randomIndex];
          return newDemos;
        }
        
        // Fallback in case we run out of images
        return prevDemos; 
      });
      
      setFadingOut(null);
    }, 300); // Match CSS transition duration

    // If we've collected 5 images, analyze them all
    if (newSelected.length >= 5) {
      await analyzeMultipleImages(newSelected);
    }
  };

  // Reset selection
  const resetSelection = async () => {
    setSelectedImages([]);
    setSelectedCount(0);
    setView('home');
    setFadingOut(null);
    
    // Re-fetch new random images from backend
    try {
      const response = await fetch('/api/random_images?count=12');
      const data = await response.json();
      
      if (data.images && data.images.length > 0) {
        // Images are already in correct format, no need to modify
        setAllImages(data.images);
        setDemoImages(data.images.slice(0, 4));
      }
    } catch (error) {
      console.error("Error re-fetching demo images:", error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans relative overflow-hidden">
      {/* ANIMATED BACKGROUND GRID - 3 Columns with Infinite Loop */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-black/ z-10"></div>
        <div className="grid grid-cols-3 gap-0 w-full opacity-30">
          {BG_COLUMNS.map((column, colIndex) => (
            <div 
              key={colIndex} 
              className="flex flex-col gap-0" 
              style={{
                animation: `scrollDown ${150 + colIndex * 10}s linear infinite`,
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
        <div className="absolute inset-0 border-2 border-white"></div>
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
            <div className="w-full bg-white/[0.04] rounded-3xl p-8 mb-8 backdrop-blur-sm border border-white/10 flex justify-center items-center hover:bg-white/[0.1] transition-colors">
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
            <div className="bg-white/[0.04] rounded-3xl p-8 backdrop-blur-sm border border-white/10 w-full hover:bg-white/[0.1] transition-colors">
              {/* ARABIC TEXT: "إختار وين ودك تسافر؟" */}
              <div className="text-center mb-4">
                <p className="text-xl font-bold mb-1">
                  اختر أكثر منظر يعجبك:
                </p>
                <p className="text-sm text-white/60 font-bold">
                  اختر 5 أماكن أو أكثر لنتيجة أفضل: {selectedCount}/5
                </p>
              </div>

              {/* PROGRESS BAR - One Big Container with Overlapping Boxes Inside */}
              <div className="w-full mb-8 flex justify-center">
                {/* Big outer container with white stroke */}
                <div 
                  className="relative border border-white rounded-full"
                  style={{ 
                    width: '168px',  // 40px * 5 - (8px overlap * 4) = 168px
                    height: '24px',
                    padding: '0'
                  }}
                >
                  {/* Individual boxes - only visible when active */}
                  {[1, 2, 3, 4, 5].map((num) => (
                    <div
                      key={num}
                      className={`absolute transition-all duration-10 ${
                        num <= selectedCount ? 'opacity-100' : 'opacity-0'
                      }`}
                      style={{
                        right: `${(num - 1) * 28}px`, // 40px width - 12px overlap = 28px spacing
                        top: '-1px', // Align perfectly with container border
                        width: '40px',
                        height: '24px',
                        borderRadius: '100px',
                        backgroundColor: '#009951',
                        border: '1px solid #FFFFFF',
                        zIndex: num,
                      }}
                    ></div>
                  ))}
                </div>
              </div>

              {/* DEMO IMAGE GRID (4 images, 2x2) with Fade-out Effect */}
              <div className="grid grid-cols-2 gap-4 w-full">
                {demoImages.map((img, i) => (
                  <div
                    key={i}
                    className={`aspect-square bg-white/5 rounded-3xl overflow-hidden border-4 border-white/80 cursor-pointer hover:scale-105 hover:border-[#FB7252] shadow-lg transition-all duration-300 ${
                      fadingOut === i ? 'opacity-0' : 'opacity-100'
                    }`}
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
            {/* Show all selected images in a grid */}
            <div className="mb-8">
              <p className="text-center text-white/60 mb-4 text-sm">
                Analyzing your {selectedImages.length} selections...
              </p>
              <div className="flex gap-2 justify-center">
                {selectedImages.slice(0, 5).map((img, i) => (
                  <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border border-[#FB7252]/30">
                    <img 
                      src={img instanceof File ? URL.createObjectURL(img) : img} 
                      className="w-full h-full object-cover grayscale opacity-60" 
                      alt={`Selected ${i + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Main scanning animation */}
            <div className="relative w-72 h-72 rounded-2xl overflow-hidden border-2 border-[#FB7252]/50 shadow-[0_0_60px_rgba(251,114,82,0.4)]">
              <div className="absolute inset-0 bg-[#FB7252]/5"></div>
              <div className="absolute w-full h-1 bg-[#FB7252] shadow-[0_0_25px_#FB7252] animate-[scan_2.5s_ease-in-out_infinite]"></div>
              
              {/* Show grid of selected images inside */}
              <div className="grid grid-cols-3 gap-1 p-4 opacity-30">
                {selectedImages.slice(0, 9).map((img, i) => (
                  <img 
                    key={i}
                    src={img instanceof File ? URL.createObjectURL(img) : img}
                    className="w-full h-20 object-cover rounded grayscale"
                    alt=""
                  />
                ))}
              </div>
            </div>

            <p className="mt-10 font-mono text-[#FB7252] text-sm animate-pulse tracking-widest">
              BUILDING PREFERENCE PROFILE...
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
              onClick={resetSelection} 
              className="mb-8 text-white/60 hover:text-white uppercase tracking-widest text-xs flex items-center gap-2 transition-colors"
            >
              ← START OVER
            </button>

            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-[#FB7252]">
              Your Perfect Matches
            </h2>
            <p className="text-white/60 mb-12 text-sm">






          
              Based on your {selectedImages.length} selections, here are destinations we think you'll love:
            </p>

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

//--------------------------------------------------------------------------------
// [] Design a logo
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
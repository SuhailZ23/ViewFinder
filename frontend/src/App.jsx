import React, { useState, useEffect } from 'react';

const App = () => {
  const [view, setView] = useState('home'); // home | scanning | results
  const [selectedImages, setSelectedImages] = useState([]); // Array of selected image URLs/files
  const [results, setResults] = useState([]);
  const [selectedCount, setSelectedCount] = useState(0); // Progress: starts at 0/5
  const [demoImages, setDemoImages] = useState([]);
  const [allImages, setAllImages] = useState([]);
  const [fadingOut, setFadingOut] = useState(null); // Track which image is fading out
  const [scanIndex, setScanIndex] = useState(0);    // Track which image is under the scanner

  // Arabic Translation Dictionary for Backend Tags
  const arabicTags = {
    "Engineering Marvels": "عجائب هندسية",
    "Waterfront": "واجهة مائية",
    "Palaces and Castles": "قصور وقلاع",
    "Ancient Civilization": "حضارة قديمة",
    "Modern Architecture": "عمارة حديثة",
    "Monuments": "معالم أثرية",
    "Urban": "طابع حضاري",
    "Islamic Heritage": "تراث إسلامي",
    "Christian Heritage": "تراث مسيحي",
    "Hilltop": "على قمة تل"
  };
  
  // Background images for scrolling grid: 3 unique columns with 8 images each (total 24 unique images)
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

  // AN array of 50 unique images
  const handPickedImages = Array.from({ length: 50 }, (_, i) => `/images/${i + 1}.jpg`);

  // Fetch random demo images from backend
  useEffect(() => {
    // Shuffle 50 images
    const shuffled = [...handPickedImages].sort(() => 0.5 - Math.random());
    setAllImages(shuffled);
    setDemoImages(shuffled.slice(0, 4));
  }, []);

  // Image swapping timer for the scanning animation
  useEffect(() => {
    let interval;
    // Only run the timer if we are in scanning mode and have images
    if (view === 'scanning' && selectedImages.length > 0) {
      interval = setInterval(() => {
        // Swap to the next image every 500ms
        setScanIndex(prev => (prev + 1) % selectedImages.length);
      }, 500); 
    }
    // Cleanup: Stop the timer if the view changes so it doesn't run forever
    return () => clearInterval(interval);
  }, [view, selectedImages]);

  // Handle file upload
  const handleUpload = async (file) => {
    if (!file) return;

    // Add to selected images array
    const uploadedImage = [file];
    setSelectedImages(uploadedImage);
    await analyzeMultipleImages(uploadedImage);
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
      const response = await fetch('https://suhailoh-viewfinder-api.hf.space/analyze_multiple', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.results) {
        const fixedResults = data.results.map(item => {
          // 1. Convert spaces back to underscores to match your files
          let fileName = item.name.replace(/ /g, '_');
          
          // 2. Handle the specific tricky names from your dataset
          if (item.name.includes("Orsay")) {
            fileName = "Musee_dOrsay";
          } else if (fileName.toLowerCase() === "statue_of_liberty") {
            fileName = "statue_of_liberty";
          }
          
          return {
            ...item,
            image: `/places/${encodeURIComponent(fileName)}.jpg`
          };
        });
        
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
    // Stop double-clicks and fast clicking
    if (fadingOut !== null || selectedImages.includes(clickedImg)) return;

    // Start fade-out animation
    setFadingOut(index);

    // Add to selected images
    const newSelected = [...selectedImages, clickedImg];
    setSelectedImages(newSelected);
    setSelectedCount(newSelected.length);

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
  const resetSelection = () => {
    setSelectedImages([]);
    setSelectedCount(0);
    setView('home');
    setFadingOut(null);
    setScanIndex(0); // Also reset the scanner timer
    
    // Simply re-shuffle your 50 local images instead of asking the backend!
    const shuffled = [...handPickedImages].sort(() => 0.5 - Math.random());
    setAllImages(shuffled);
    setDemoImages(shuffled.slice(0, 4));
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans relative overflow-x-hidden">
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
      <div className="absolute inset-0 pointer-events-none z-50">
        <div className="absolute inset-0 border-2 border-white/30"></div>
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-10 min-h-screen p-4 md:p-8">

        {/* VIEW: HOME */}
        {view === 'home' && (
          <div className="flex flex-col items-center justify-center min-h-screen max-w-md mx-auto">
            
            {/* LOGO */}
            <div className="mb-4">
              <LogoSVG />
            </div>

            {/* UPLOAD AREA - Small Semi-transparent Box */}
            <div className="w-full bg-white/[0.04] rounded-3xl py-4 px-8 mb-4 backdrop-blur-sm border border-white/10 flex justify-center items-center hover:bg-white/[0.1] transition-colors">
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

            <div className="text-4xl font-bold mb-4">
              أو
            </div>

            {/* SUGGESTIONS AREA - Large Semi-transparent Box */}
            <div className="bg-white/[0.04] rounded-3xl p-8 backdrop-blur-sm border border-white/10 w-full hover:bg-white/[0.1] transition-colors">
              <div className="text-center mb-4">
                <p className="text-xl font-bold mb-1">
                  اختر أكثر منظر يعجبك:
                </p>
                <p className="text-sm text-white/60 font-bold">
                  اختر 5 أماكن لنتيجة أفضل: {selectedCount}/5
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
                    // pointer-events-none so it can't be clicked while invisible
                    className={`aspect-square bg-white/5 rounded-3xl overflow-hidden border-4 border-white/80 cursor-pointer hover:scale-105 hover:border-[#FB7252] shadow-lg transition-all duration-300 ${
                      fadingOut === i ? 'opacity-0 pointer-events-none' : 'opacity-100'
                    }`}
                    onClick={() => handleDemoClick(img, i)}
                  >
                    <img 
                      key={img} // drop the old photo instantly
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
            
            {/* TEXT & SMALL IMAGE GRID */}
            <div className="mb-8 flex flex-col items-center w-full">
              
              {/* BIG, SPECIAL SCANNING TEXT */}
              <h2 
                dir="rtl" 
                className="text-2xl md:text-3xl font-bold mb-6 text-[#FB7252] animate-pulse drop-shadow-[0_0_15px_rgba(251,114,82,0.4)]"
              >
                جاري تحليل تفضيلاتك...
              </h2>
              
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
            <div className="relative w-72 h-72 rounded-2xl overflow-hidden border-2 border-[#FB7252]/50 shadow-[0_0_60px_rgba(251,114,82,0.4)] bg-black/50">
              
              {/* THE DYNAMIC SWAPPING IMAGE */}
              {selectedImages.length > 0 && (
                <img 
                  src={selectedImages[scanIndex] instanceof File ? URL.createObjectURL(selectedImages[scanIndex]) : selectedImages[scanIndex]} 
                  className="absolute inset-0 w-full h-full object-cover grayscale opacity-50 transition-opacity duration-200"
                  alt="Scanning target"
                />
              )}

              {/* The Laser */}
              <div className="absolute inset-0 bg-[#FB7252]/10 z-10 pointer-events-none"></div>
              <div className="absolute w-full h-1 bg-[#FB7252] shadow-[0_0_25px_#FB7252] animate-[scan_2.5s_ease-in-out_infinite] z-20 pointer-events-none"></div>

            </div>

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
          <div className="min-h-screen pt-4 md:pt-10 px-6 md:px-12 max-w-6xl mx-auto flex flex-col">
            
            {/* 1. Logo Centered */}
            <div className="mb-4 flex justify-center opacity-90 pointer-events-none">
              <div className="scale-90">
                <LogoSVG />
              </div>
            </div>

            {/* 2. Back Button */}
            <div className="mb-8 flex justify-center md:justify-start">
              <button 
                onClick={resetSelection} 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/20 hover:text-white font-bold transition-all duration-300 text-xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                ابحث عن مكان آخر
              </button>
            </div>

            {/* 3. PAGE TITLE */}
            <div dir="rtl" className="text-center md:text-right">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-[#FB7252]">
                أفضل الوجهات لك
              </h2>
              <p className="text-white/60 mb-10 text-sm">
                بناءً على تفضيلاتك، ستحب هذه الأماكن:
              </p>
            </div>

            {/* RESULTS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-20" dir="rtl">
              {results.length > 0 ? results.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden hover:-translate-y-2 hover:border-[#FB7252]/50 transition-all duration-500 group flex flex-col text-right"
                >
                  {/* 1. IMAGE SECTION */}
                  <div className="h-64 overflow-hidden relative">
                    <img 
                      src={item.image} 
                      onError={(e) => e.target.src = "https://via.placeholder.com/400"} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                      alt={item.name}
                    />
                  </div>

                  {/* 2. INFO SECTION */}
                  <div className="p-6 flex-grow flex flex-col justify-between">
                    
                    {/* 2.2.Centered Name */}
                    <h3 className="text-xl font-bold mb-4 text-center">{item.name}</h3>
                    
                    <div className="mt-auto">
                      
                      {/* 2.3. What makes it special for you? */}
                      <p className="text-white/70 text-sm mb-3 font-bold">
                       ما يجعله مميزًا بالنسبة لك؟
                      </p>
                      
                      <div className="flex flex-col sm:flex-row sm:flex-nowrap justify-between items-start sm:items-end gap-4 w-full">
                        
                        {/* 2.4. TAGS */}
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto flex-grow">
                          {item.matchReason
                            .split(',')
                            .filter(tag => tag.trim() !== 'General') 
                            .map((tag, index) => {
                              const cleanTag = tag.replace(/_/g, ' ').trim();
                              const translatedTag = arabicTags[cleanTag] || cleanTag; 

                              return (
                                <span 
                                  key={index}
                                  className="flex items-center px-3 py-2 rounded-lg border border-[#FB7252]/40 text-[10px] font-bold bg-[#FB7252]/10 text-[#FB7252]"
                                >
                                  {translatedTag}
                                </span>
                              );
                            })}
                        </div>

                        {/* 2.5.GOOGLE MAPS BUTTON */}
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full sm:w-auto shrink-0 whitespace-nowrap flex justify-center items-center gap-1.5 py-2 px-3 rounded-lg border border-white/20 text-xs font-bold text-white hover:bg-white hover:text-black transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                          </svg>
                          خرائط جوجل
                        </a>

                      </div>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="col-span-3 text-center text-white/40 py-20">لم يتم العثور على نتائج.</div>
              )}
            </div>
          </div>
        )}

        {/* FOOTER SIGNATURE */}
        <div className="mt-16 pb-8 flex flex-col items-center justify-center opacity-70 hover:opacity-100 transition-opacity duration-300">
          <p className="text-sm text-white/70 font-bold mb-2">
            Made by Suhail
          </p>
          <div className="flex gap-6 text-xs font-bold">
            <a 
              href="https://github.com/SuhailZ23/ViewFinder" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[#FB7252] hover:text-white transition-colors"
            >
              GitHub
            </a>
            <a 
              href="https://www.linkedin.com/in/suhail-a-alzahrani/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[#FB7252] hover:text-white transition-colors"
            >
              LinkedIn
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};

// Logo
const LogoSVG = () => (
  <svg width="280" height="50" viewBox="0 0 280 50" fill="none" xmlns="http://www.w3.org/2000/svg">
    <text 
      x="140" 
      y="30" 
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

// Upload Button
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

    {/* Upload Text */}
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
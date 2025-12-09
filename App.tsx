import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { UploadArea } from './components/UploadArea';
import { ResultDisplay } from './components/ResultDisplay';
import { analyzeViolationImage } from './services/geminiService';
import { getCurrentLocation } from './utils/geo';
import { getExifLocation } from './utils/exif';
import { getJurisdictionDetails } from './utils/jurisdiction';
import { getOfficialCitation } from './utils/citations';
import { ViolationReport, GeoLocation, Jurisdiction } from './types';
import { Loader2, AlertCircle } from 'lucide-react';

const VIOLATION_TYPES = [
  "Stopping in Bicycle Lane",
  "Using Phone Whilst Driving",
  "Running Red Light",
  "Blocking Crosswalk",
  "Improper Parking",
  "Dangerous Driving",
  "Other"
];

export default function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [report, setReport] = useState<ViolationReport | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form State
  const [violationType, setViolationType] = useState<string>("");
  const [customViolation, setCustomViolation] = useState<string>("");

  const handleImageSelected = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);

    // Read file to Base64 for Display/AI
    const readFileAsBase64 = (f: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(f);
        });
    };

    try {
      const base64Image = await readFileAsBase64(file);

      // 1. Get Location (Try EXIF first, then Device)
      let location: GeoLocation | null = null;
      let locationSource: 'image' | 'device' | null = null;

      try {
        // Attempt EXIF extraction
        const exifData = await getExifLocation(file);
        if (exifData) {
            location = {
                latitude: exifData.latitude,
                longitude: exifData.longitude,
                accuracy: 0 // EXIF doesn't usually provide accuracy radius like GPS API
            };
            locationSource = 'image';
        } else {
            // Fallback to Device
            try {
                location = await getCurrentLocation();
                locationSource = 'device';
            } catch (locErr) {
                 console.warn("Could not retrieve device location:", locErr);
            }
        }
      } catch (e) {
        console.error("Location strategy failed", e);
        // Fallback attempt if EXIF crashed
        if (!location) {
             try {
                location = await getCurrentLocation();
                locationSource = 'device';
             } catch (locErr) {}
        }
      }

      // 2. Determine Jurisdiction Details based on Location
      let jurisdiction: Jurisdiction = {
        state: "",
        city: "",
        email: "violations@usa.gov"
      };

      if (location) {
        try {
          jurisdiction = await getJurisdictionDetails(location.latitude, location.longitude);
        } catch (jErr) {
          console.warn("Could not determine jurisdiction:", jErr);
        }
      }

      // 3. Analyze Image with Gemini
      const analysis = await analyzeViolationImage(base64Image);

      // 4. Determine User Violation String
      // If user selected something, use it. If not, fallback to AI detection.
      let finalUserViolation = analysis.violationType || "Unspecified Violation";
      
      // If AI returns 'None observed' or similar, default to empty to force user input if not already selected
      if (!violationType && (!analysis.violationType || analysis.violationType === "None observed")) {
          finalUserViolation = "";
      } else if (violationType === "Other") {
        finalUserViolation = customViolation.trim() || "Other (Unspecified)";
      } else if (violationType) {
        finalUserViolation = violationType;
      }

      // 5. Look up Official Citation
      const officialCitation = getOfficialCitation(
        jurisdiction.state,
        jurisdiction.city,
        finalUserViolation
      );

      // 6. Construct Report
      const newReport: ViolationReport = {
        id: Math.random().toString(36).substr(2, 9).toUpperCase(),
        timestamp: new Date().toISOString(),
        location,
        locationSource,
        analysis,
        userReportedViolation: finalUserViolation,
        recipientEmail: jurisdiction.email,
        imageUrl: base64Image,
        jurisdiction,
        officialCitation
      };

      setReport(newReport);
      setIsSubmitted(false); // Initially in draft/review mode
    } catch (err: any) {
      console.error("Processing failed:", err);
      setError(err.message || "An unexpected error occurred while processing the image.");
    } finally {
      setIsProcessing(false);
    }
  }, [violationType, customViolation]);

  const handleReset = () => {
    setReport(null);
    setError(null);
    setViolationType("");
    setCustomViolation("");
    setIsSubmitted(false);
  };

  const handleConfirmReport = () => {
    setIsSubmitted(true);
  };

  const handleViolationUpdate = (newViolation: string) => {
    if (report) {
      // Re-evaluate citation based on new violation
      const updatedCitation = getOfficialCitation(
        report.jurisdiction?.state || "",
        report.jurisdiction?.city || "",
        newViolation
      );

      setReport({ 
        ...report, 
        userReportedViolation: newViolation,
        officialCitation: updatedCitation
      });
    }
  };

  const handleLicensePlateUpdate = (newPlate: string) => {
    if (report) {
      setReport({
        ...report,
        analysis: {
          ...report.analysis,
          licensePlate: newPlate.toUpperCase()
        }
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 bg-[#f8fafc]">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-8 sm:py-12 max-w-3xl">
        
        {/* Intro Text */}
        {!report && (
          <div className="text-center mb-10 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Cycle Safety USA
            </h2>
            <p className="text-lg text-slate-600 max-w-xl mx-auto">
              Report traffic violations to keep our streets safe for cycling.
            </p>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-left max-w-lg mx-auto mt-6 animate-fade-in-up">
                <h3 className="font-semibold text-slate-900 mb-3 border-b border-slate-100 pb-2">How to Report a Violation:</h3>
                <ol className="list-decimal list-inside space-y-2 text-slate-600 text-sm">
                    <li><span className="font-medium text-slate-800">Spot the violation:</span> e.g. Vehicle illegally parked in a bike lane.</li>
                    <li><span className="font-medium text-slate-800">Snap a photo:</span> Ensure the license plate and the context (bike lane lines) are clearly visible.</li>
                    <li><span className="font-medium text-slate-800">Upload & Review:</span> Upload the photo below. We attempt to read the location from the photo first.</li>
                    <li><span className="font-medium text-slate-800">Submit:</span> Send the pre-filled report email to your local public works department.</li>
                </ol>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3 text-red-700 animate-pulse">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold">Processing Failed</h4>
              <p className="text-sm">{error}</p>
            </div>
            <button 
                onClick={() => setError(null)}
                className="ml-auto text-sm underline hover:text-red-900"
            >
                Dismiss
            </button>
          </div>
        )}

        {/* Loading State */}
        {isProcessing && (
           <div className="flex flex-col items-center justify-center py-20 space-y-6 animate-fade-in">
             <div className="relative">
               <div className="absolute inset-0 bg-red-100 rounded-full blur-xl animate-pulse"></div>
               <Loader2 className="w-16 h-16 text-red-600 animate-spin relative z-10" />
             </div>
             <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-slate-800">Analyzing Evidence...</h3>
                <p className="text-slate-500">Checking metadata, extracting plates, and locating authorities.</p>
             </div>
           </div>
        )}

        {/* Main Content Area */}
        {!isProcessing && !report && (
          <div className="animate-fade-in-up space-y-6">
            
            {/* Violation Type Selector */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <label className="block text-sm font-semibold text-slate-900 mb-3">
                1. Select Violation Type (Optional)
              </label>
              <div className="space-y-4">
                <select
                  value={violationType}
                  onChange={(e) => setViolationType(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all appearance-none cursor-pointer"
                  style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131313%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '0.8em' }}
                >
                  <option value="">Auto-detect using AI</option>
                  {VIOLATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                {violationType === 'Other' && (
                  <div className="animate-fade-in">
                    <input
                      type="text"
                      value={customViolation}
                      onChange={(e) => setCustomViolation(e.target.value)}
                      placeholder="Describe the violation here..."
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Upload Area */}
            <div className="relative">
              <div className="absolute -top-3 left-6 bg-[#f8fafc] px-2 z-10">
                <span className="text-sm font-semibold text-slate-900">2. Upload Evidence</span>
              </div>
              <UploadArea onImageSelected={handleImageSelected} isProcessing={isProcessing} />
            </div>

          </div>
        )}

        {!isProcessing && report && (
          <ResultDisplay 
            report={report} 
            onReset={handleReset} 
            isSubmitted={isSubmitted}
            onConfirm={handleConfirmReport}
            onViolationChange={handleViolationUpdate}
            onLicensePlateChange={handleLicensePlateUpdate}
            violationTypes={VIOLATION_TYPES}
          />
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-slate-400 text-sm">
        <p>© {new Date().getFullYear()} Cycle Safety USA. Powered by Google Gemini.</p>
      </footer>
    </div>
  );
}
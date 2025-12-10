import React, { useRef, useState } from 'react';
import { Upload, Camera, Image as ImageIcon } from 'lucide-react';

interface UploadAreaProps {
  onImageSelected: (file: File) => void;
  isProcessing: boolean;
}

export const UploadArea: React.FC<UploadAreaProps> = ({ onImageSelected, isProcessing }) => {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      onImageSelected(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  return (
    <div className="w-full">
      {/* Input for Gallery (Generic File Picker) */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      
      {/* Input for Camera (Forces Camera on Mobile) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment" 
        className="hidden"
        onChange={handleChange}
      />

      <div
        className={`relative group border-2 border-dashed rounded-2xl p-6 sm:p-10 transition-all duration-300 ease-in-out text-center
          ${dragActive ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-red-400 hover:bg-slate-50'}
          ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center space-y-6">
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-slate-900">
              Upload Violation Photo
            </h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">
              Drag and drop an image here or choose an option below.
            </p>
          </div>

          <div className="flex w-full gap-4 max-w-md justify-center">
            {/* Take Photo Button */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 flex flex-col items-center justify-center p-4 bg-white border-2 border-slate-100 hover:border-red-200 hover:bg-red-50 rounded-xl transition-all group active:scale-95 shadow-sm"
            >
               <div className="p-3 bg-red-100 rounded-full mb-2 group-hover:bg-red-200 transition-colors">
                  <Camera className="w-6 h-6 text-red-600" />
               </div>
               <span className="font-medium text-slate-800 text-sm">Take Photo</span>
            </button>

            {/* Gallery Button */}
            <button
              onClick={() => galleryInputRef.current?.click()}
              className="flex-1 flex flex-col items-center justify-center p-4 bg-white border-2 border-slate-100 hover:border-blue-200 hover:bg-blue-50 rounded-xl transition-all group active:scale-95 shadow-sm"
            >
               <div className="p-3 bg-blue-100 rounded-full mb-2 group-hover:bg-blue-200 transition-colors">
                  <ImageIcon className="w-6 h-6 text-blue-600" />
               </div>
               <span className="font-medium text-slate-800 text-sm">From Gallery</span>
            </button>
          </div>

          <div className="flex gap-4 text-xs font-medium text-slate-400 pt-2">
            <span className="flex items-center"><ImageIcon className="w-3 h-3 mr-1" /> JPEG, PNG</span>
            <span className="flex items-center"><Upload className="w-3 h-3 mr-1" /> Max 10MB</span>
          </div>
        </div>
      </div>
    </div>
  );
};
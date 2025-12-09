import React, { useRef, useState } from 'react';
import { Upload, Camera, Image as ImageIcon } from 'lucide-react';

interface UploadAreaProps {
  onImageSelected: (file: File) => void;
  isProcessing: boolean;
}

export const UploadArea: React.FC<UploadAreaProps> = ({ onImageSelected, isProcessing }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      <div
        className={`relative group border-2 border-dashed rounded-2xl p-8 sm:p-12 transition-all duration-300 ease-in-out text-center cursor-pointer
          ${dragActive ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:border-red-400 hover:bg-slate-50'}
          ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment" // Hints mobile browsers to use the camera
          className="hidden"
          onChange={handleChange}
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-white rounded-full shadow-md group-hover:shadow-lg transition-shadow">
             <Camera className="w-10 h-10 text-slate-700 group-hover:text-red-600 transition-colors" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-slate-900">
              Upload Violation Photo
            </h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">
              Tap to capture or drag and drop an image file here. We'll extract the details automatically.
            </p>
          </div>
          <div className="flex gap-4 text-xs font-medium text-slate-400">
            <span className="flex items-center"><ImageIcon className="w-3 h-3 mr-1" /> JPEG, PNG</span>
            <span className="flex items-center"><Upload className="w-3 h-3 mr-1" /> Max 10MB</span>
          </div>
        </div>
      </div>
    </div>
  );
};
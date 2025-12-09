import React from 'react';
import { Bike } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-50">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-red-600 p-2 rounded-lg">
            <Bike className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Cycle Safety <span className="text-red-500">USA</span></h1>
        </div>
        {/* Secure Reporting section removed as requested */}
      </div>
    </header>
  );
};
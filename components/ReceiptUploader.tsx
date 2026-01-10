
import React, { useRef } from 'react';

interface ReceiptUploaderProps {
  onUpload: (base64: string) => void;
  isLoading: boolean;
}

const ReceiptUploader: React.FC<ReceiptUploaderProps> = ({ onUpload, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        onUpload(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="relative">
      {/* 
        v1.3.0: Added accept images and capture environment 
        This allows users to choose between taking a photo, library, or files (inc. cloud drives)
      */}
      <input 
        type="file" 
        accept="image/*" 
        capture="environment"
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <button 
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        className={`w-full group relative overflow-hidden bg-indigo-600 hover:bg-indigo-700 text-white p-8 rounded-2xl flex flex-col items-center justify-center gap-4 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isLoading ? (
          <>
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
            <div className="text-center">
              <p className="font-bold text-lg">Analisando com IA...</p>
              <p className="text-indigo-200 text-sm">Extraindo itens e verificando nutrição</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <i className="fa-solid fa-camera text-3xl"></i>
            </div>
            <div className="text-center">
              <p className="font-bold text-xl">Digitalizar Talão</p>
              <p className="text-indigo-100">Câmara, Ficheiros ou Drive</p>
            </div>
          </>
        )}
      </button>
    </div>
  );
};

export default ReceiptUploader;

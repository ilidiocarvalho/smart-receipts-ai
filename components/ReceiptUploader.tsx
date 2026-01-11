
import React, { useRef } from 'react';

interface ReceiptUploaderProps {
  onUpload: (files: { data: string, type: string }[]) => void;
  isLoading: boolean;
  progressText?: string;
}

const ReceiptUploader: React.FC<ReceiptUploaderProps> = ({ onUpload, isLoading, progressText }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Added explicit type cast to File[] to avoid 'unknown' inference in the mapping process
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const processedFiles = await Promise.all(
      files.map((file) => {
        return new Promise<{ data: string, type: string }>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            // Resolve with file.type which is now accessible
            resolve({ data: base64, type: file.type });
          };
          // Pass file to readAsDataURL which now correctly identifies it as a Blob
          reader.readAsDataURL(file);
        });
      })
    );

    onUpload(processedFiles);
    // Reset input so the same files can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="relative">
      {/* 
        v1.3.2: 
        - accept="image/*,application/pdf" combined triggers system intent on Android.
        - multiple allows batch selection.
      */}
      <input 
        type="file" 
        accept="image/*,application/pdf" 
        multiple
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <button 
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        className={`w-full group relative overflow-hidden bg-indigo-600 hover:bg-indigo-700 text-white p-8 rounded-2xl flex flex-col items-center justify-center gap-4 transition-all shadow-xl shadow-indigo-100 disabled:opacity-80 disabled:cursor-not-allowed`}
      >
        {isLoading ? (
          <>
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
            <div className="text-center">
              <p className="font-bold text-lg">{progressText || 'Analisando com IA...'}</p>
              <p className="text-indigo-200 text-sm">Extraindo dados e conferindo nutrição</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <i className="fa-solid fa-cloud-arrow-up text-3xl"></i>
            </div>
            <div className="text-center">
              <p className="font-bold text-xl">Digitalizar Talão / PDF</p>
              <p className="text-indigo-100">Câmara, Galeria, Drive ou PDF</p>
            </div>
          </>
        )}
      </button>
    </div>
  );
};

export default ReceiptUploader;

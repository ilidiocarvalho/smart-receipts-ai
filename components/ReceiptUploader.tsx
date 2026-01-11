
import React, { useRef } from 'react';

interface ReceiptUploaderProps {
  onUpload: (files: { data: string, type: string }[]) => void;
  isLoading: boolean;
  processingStep?: 'idle' | 'compressing' | 'analyzing' | 'finalizing';
  currentProcessIndex?: number;
  totalInBatch?: number;
}

const ReceiptUploader: React.FC<ReceiptUploaderProps> = ({ 
  onUpload, 
  isLoading, 
  processingStep = 'idle',
  currentProcessIndex = 1,
  totalInBatch = 1
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const processedFiles = await Promise.all(
      files.map((file) => {
        return new Promise<{ data: string, type: string }>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve({ data: base64, type: file.type });
          };
          reader.readAsDataURL(file);
        });
      })
    );

    onUpload(processedFiles);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getStepText = () => {
    switch (processingStep) {
      case 'compressing': return 'Otimizando imagem...';
      case 'analyzing': return 'IA a ler faturas...';
      case 'finalizing': return 'A organizar dados...';
      default: return 'Processando...';
    }
  };

  const getStepProgress = () => {
    switch (processingStep) {
      case 'compressing': return '30%';
      case 'analyzing': return '70%';
      case 'finalizing': return '95%';
      default: return '0%';
    }
  };

  return (
    <div className="relative">
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
        className={`w-full group relative overflow-hidden bg-indigo-600 text-white p-8 rounded-2xl flex flex-col items-center justify-center gap-4 transition-all shadow-xl shadow-indigo-100 disabled:bg-indigo-900 disabled:cursor-not-allowed active:scale-[0.98]`}
      >
        {isLoading ? (
          <>
            <div className="relative">
              <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black">
                {currentProcessIndex}/{totalInBatch}
              </div>
            </div>
            
            <div className="text-center space-y-2 w-full max-w-xs">
              <p className="font-black text-lg tracking-tight">{getStepText()}</p>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-400 h-full transition-all duration-700 ease-out" 
                  style={{ width: getStepProgress() }}
                ></div>
              </div>
              <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest">Mantenha o ecrã ligado</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <i className="fa-solid fa-cloud-arrow-up text-3xl"></i>
            </div>
            <div className="text-center">
              <p className="font-black text-xl tracking-tight">Digitalizar Talão / PDF</p>
              <p className="text-indigo-100 font-medium">Câmara, Galeria ou Documentos</p>
            </div>
          </>
        )}
      </button>
    </div>
  );
};

export default ReceiptUploader;

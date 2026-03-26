import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface Props {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  label: string;
}

export default function ImageDropzone({ onFileSelect, selectedFile, label }: Props) {
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        onFileSelect(file);
        setPreview(URL.createObjectURL(file));
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
        transition-all duration-200 min-h-[200px] flex items-center justify-center
        ${isDragActive
          ? 'border-blue-400 bg-blue-50'
          : selectedFile
            ? 'border-green-300 bg-green-50/50'
            : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
        }
      `}
    >
      <input {...getInputProps()} />

      {preview ? (
        <div className="space-y-3">
          <img
            src={preview}
            alt="Preview"
            className="max-h-36 mx-auto rounded-lg shadow-sm"
          />
          <p className="text-xs text-slate-500">{selectedFile?.name}</p>
          <p className="text-xs text-green-600 font-medium">Click để đổi ảnh khác</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="w-12 h-12 mx-auto bg-slate-100 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16v-8m0 0l-3 3m3-3l3 3M3 16.5V18a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 18v-1.5M7.5 12l4.5-4.5 4.5 4.5" />
            </svg>
          </div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-xs text-slate-400">PNG, JPG, WEBP &middot; Tối đa 10MB</p>
        </div>
      )}
    </div>
  );
}

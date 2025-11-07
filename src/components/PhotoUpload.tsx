import { useState, useRef, useEffect, ChangeEvent } from 'react';

interface PhotoUploadProps {
  onPhotosChange: (files: File[]) => void;
  maxPhotos?: number;
  existingPhotos?: number;
  resetKey?: number; // Key to force reset when form is cleared
}

export function PhotoUpload({ onPhotosChange, maxPhotos = 5, existingPhotos = 0, resetKey = 0 }: PhotoUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevResetKeyRef = useRef(resetKey);

  // Reset when resetKey changes
  useEffect(() => {
    if (resetKey !== prevResetKeyRef.current && resetKey > prevResetKeyRef.current) {
      setSelectedFiles([]);
      setPreviews([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      prevResetKeyRef.current = resetKey;
    }
  }, [resetKey]);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalPhotos = existingPhotos + selectedFiles.length + files.length;

    if (totalPhotos > maxPhotos) {
      alert(`Maximum ${maxPhotos} photos allowed. You already have ${existingPhotos} photo(s) and are trying to add ${files.length} more.`);
      return;
    }

    // Validate file types and sizes
    const validFiles: File[] = [];
    const maxSize = 5 * 1024 * 1024; // 5MB

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file.`);
        return;
      }
      if (file.size > maxSize) {
        alert(`${file.name} is too large. Maximum size is 5MB.`);
        return;
      }
      validFiles.push(file);
    });

    if (validFiles.length === 0) return;

    const newFiles = [...selectedFiles, ...validFiles];
    setSelectedFiles(newFiles);
    onPhotosChange(newFiles);

    // Create previews
    const newPreviews: string[] = [];
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        newPreviews.push(result);
        if (newPreviews.length === validFiles.length) {
          setPreviews([...previews, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setPreviews(newPreviews);
    onPhotosChange(newFiles);
  };

  const remainingSlots = maxPhotos - existingPhotos - selectedFiles.length;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Medication Photos (Optional)
        {existingPhotos > 0 && (
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            ({existingPhotos} existing)
          </span>
        )}
      </label>

      {selectedFiles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:bg-red-600"
                aria-label="Remove photo"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {remainingSlots > 0 && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="photo-upload"
          />
          <label
            htmlFor="photo-upload"
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Add Photos ({remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} remaining)
          </label>
        </div>
      )}

      {remainingSlots === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Maximum {maxPhotos} photos reached.
        </p>
      )}
    </div>
  );
}


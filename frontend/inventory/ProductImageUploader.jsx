import React, { useRef, useState } from "react";
import { UploadCloud, X, Star, Image as ImageIcon, AlertCircle } from "lucide-react";
import { getProductImageUrl } from "../inventoryApi.js";

export const ProductImageUploader = ({
  images = [],
  onImagesChange,
  primaryImageId,
  onSetPrimary,
  onDeleteImage,
}) => {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleFiles = (files) => {
    setUploadError("");
    if (!files || files.length === 0) return;

    const validFiles = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate MIME type
      const validTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!validTypes.includes(file.type)) {
        setUploadError(`File "${file.name}" rejected: Only JPEG, PNG, and WebP are supported.`);
        return;
      }

      // Validate size (max 8MB)
      if (file.size > 8 * 1024 * 1024) {
        setUploadError(`File "${file.name}" rejected: Maximum file size is 8MB.`);
        return;
      }

      validFiles.push(file);
    }

    // Convert to Base64 and hand off
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Data = e.target.result;
        onImagesChange({
          file,
          filename: file.name,
          base64Data,
          previewUrl: URL.createObjectURL(file),
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer?.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Product Images</h4>
          <p className="text-[11px] text-slate-400">Upload high-resolution photography. The primary image displays in catalogs.</p>
        </div>
        <span className="text-[11px] font-semibold text-slate-400">{images.length} / 6 Images</span>
      </div>

      {uploadError ? (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      ) : null}

      {/* Grid of uploaded images + Drop zone */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {images.map((img, idx) => {
          const isPrimary = primaryImageId ? img.id === primaryImageId : idx === 0 || img.is_primary;
          const displayUrl = img.previewUrl || getProductImageUrl(img) || img.dataUrl;

          return (
            <div
              key={img.id || idx}
              className={`group relative aspect-square rounded-2xl border overflow-hidden bg-slate-100 flex items-center justify-center transition-all ${
                isPrimary ? "border-orange-500 ring-2 ring-orange-500/20" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {displayUrl ? (
                <img
                  src={displayUrl}
                  alt={img.original_filename || "Product photo"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImageIcon className="h-6 w-6 text-slate-400" />
              )}

              {/* Primary badge */}
              {isPrimary ? (
                <span className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-orange-500/90 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs">
                  <Star className="h-2.5 w-2.5 fill-white" /> Primary
                </span>
              ) : null}

              {/* Hover actions */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                {!isPrimary && onSetPrimary ? (
                  <button
                    type="button"
                    title="Set as Primary Image"
                    onClick={() => onSetPrimary(img)}
                    className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-700 hover:text-orange-600 transition-colors"
                  >
                    <Star className="h-3.5 w-3.5" />
                  </button>
                ) : null}

                {onDeleteImage ? (
                  <button
                    type="button"
                    title="Remove Image"
                    onClick={() => onDeleteImage(img)}
                    className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-700 hover:text-rose-600 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}

        {/* Drop zone if fewer than 6 images */}
        {images.length < 6 ? (
          <div
            onDragEnter={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragActive(false);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
              dragActive
                ? "border-orange-500 bg-orange-50/50 scale-98"
                : "border-slate-200 hover:border-orange-400 bg-slate-50/50 hover:bg-orange-50/20"
            }`}
          >
            <UploadCloud className="h-5 w-5 text-slate-400 group-hover:text-orange-500" />
            <span className="mt-1 text-[10px] font-bold text-slate-600">Upload</span>
            <span className="text-[9px] text-slate-400">Drop or browse</span>
          </div>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
};

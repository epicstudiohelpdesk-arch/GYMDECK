import React, { useId, useRef, useState } from "react";
import { Image as ImageIcon, Star, Trash2, UploadCloud } from "lucide-react";
import { InlineAlert } from "./InventoryUI.jsx";
import { getProductImageUrl } from "../inventoryApi.js";

const MAX_IMAGES = 6;
const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export const ProductImageUploader = ({
  images = [],
  onImagesChange,
  primaryImageId,
  onSetPrimary,
  onDeleteImage,
}) => {
  const inputId = useId();
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const remaining = Math.max(0, MAX_IMAGES - images.length);

  const handleFiles = (fileList) => {
    setUploadError("");
    if (!fileList || fileList.length === 0) return;

    const validFiles = [];
    for (let index = 0; index < fileList.length; index += 1) {
      const file = fileList[index];
      if (!ACCEPTED.includes(file.type)) {
        setUploadError(`“${file.name}” was rejected. Use JPEG, PNG or WebP images.`);
        return;
      }
      if (file.size > MAX_BYTES) {
        setUploadError(`“${file.name}” was rejected. The maximum size is 8 MB.`);
        return;
      }
      validFiles.push(file);
    }

    if (validFiles.length > remaining) {
      setUploadError(`Only ${remaining} more image${remaining === 1 ? "" : "s"} can be added (max ${MAX_IMAGES}).`);
    }

    validFiles.slice(0, remaining).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        onImagesChange?.({
          file,
          filename: file.name,
          base64Data: event.target.result,
          previewUrl: URL.createObjectURL(file),
        });
      };
      reader.readAsDataURL(file);
    });

    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    handleFiles(event.dataTransfer?.files);
  };

  return (
    <div className="space-y-3">
      {uploadError ? <InlineAlert tone="amber">{uploadError}</InlineAlert> : null}

      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
        {images.map((image, index) => {
          const isPrimary = primaryImageId
            ? image.id === primaryImageId || image.previewUrl === primaryImageId
            : index === 0 || image.is_primary;
          const displayUrl = image.previewUrl || getProductImageUrl(image) || image.dataUrl;
          const label = image.original_filename || image.filename || `Image ${index + 1}`;

          return (
            <div
              key={image.id || image.previewUrl || index}
              className={`group relative aspect-square overflow-hidden rounded-xl border bg-slate-100 ${
                isPrimary ? "border-orange-400 ring-2 ring-orange-500/15" : "border-slate-200"
              }`}
            >
              {displayUrl ? (
                <img src={displayUrl} alt={label} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center">
                  <ImageIcon size={20} className="text-slate-400" aria-hidden="true" />
                </span>
              )}

              {isPrimary ? (
                <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-orange-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
                  <Star size={9} className="fill-white" aria-hidden="true" /> Primary
                </span>
              ) : null}

              <div className="absolute inset-x-1 bottom-1 flex items-center justify-center gap-1">
                {!isPrimary && onSetPrimary ? (
                  <button
                    type="button"
                    aria-label={`Set ${label} as primary image`}
                    title="Set as primary"
                    onClick={() => onSetPrimary(image)}
                    className="grid h-6 w-6 place-items-center rounded-md border border-slate-200 bg-white/95 text-slate-600 shadow-sm transition-colors hover:text-orange-600"
                  >
                    <Star size={11} strokeWidth={2.2} aria-hidden="true" />
                  </button>
                ) : null}
                {onDeleteImage ? (
                  <button
                    type="button"
                    aria-label={`Remove ${label}`}
                    title="Remove image"
                    onClick={() => onDeleteImage(image)}
                    className="grid h-6 w-6 place-items-center rounded-md border border-slate-200 bg-white/95 text-slate-600 shadow-sm transition-colors hover:text-rose-600"
                  >
                    <Trash2 size={11} strokeWidth={2.2} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}

        {images.length < MAX_IMAGES ? (
          <label
            htmlFor={inputId}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragActive(false);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-center transition-colors ${
              dragActive
                ? "border-orange-400 bg-orange-50/70"
                : "border-slate-200 bg-slate-50/60 hover:border-orange-300 hover:bg-orange-50/40"
            }`}
          >
            <UploadCloud size={17} className={dragActive ? "text-orange-500" : "text-slate-400"} aria-hidden="true" />
            <span className="text-[10px] font-bold text-slate-600">Upload</span>
            <span className="text-[9px] text-slate-400">{remaining} left</span>
          </label>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-slate-400">
        <span>JPEG, PNG or WebP · up to 8 MB each · {MAX_IMAGES} images max</span>
        <span className="font-semibold tabular-nums">
          {images.length} / {MAX_IMAGES}
        </span>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED.join(",")}
        multiple
        className="sr-only"
        onChange={(event) => handleFiles(event.target.files)}
      />
    </div>
  );
};

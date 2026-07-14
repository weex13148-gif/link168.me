'use client';

import { useState, useCallback } from "react";

export type MediaUploaderProps = {
  mediaType: "avatar" | "background" | "cover" | "carousel" | "popup" | "product_cover" | "service_cover" | "enterprise_logo" | "enterprise_public_image" | "custom_link_icon";
  workspaceId?: string;
  existingUrl?: string;
  onUploadStart?: () => void;
  onUploadSuccess?: (result: { mediaId: string; url: string; mimeType: string; sizeBytes: number }) => void;
  onUploadError?: (error: { message: string; code?: string }) => void;
  onDelete?: () => void;
  accept?: string;
  maxFileSize?: number;
};

const ACCEPT_TYPES = "image/jpeg,image/png,image/webp,image/gif";

export function MediaUploader({
  mediaType,
  workspaceId,
  existingUrl,
  onUploadStart,
  onUploadSuccess,
  onUploadError,
  onDelete,
  accept = ACCEPT_TYPES,
  maxFileSize = 5 * 1024 * 1024,
}: MediaUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setError(null);

      if (file.size > maxFileSize) {
        const msg = `文件大小超过限制（最大 ${maxFileSize / 1024 / 1024}MB）`;
        setError(msg);
        onUploadError?.({ message: msg, code: "FILE_TOO_LARGE" });
        return;
      }

      if (!file.type.startsWith("image/")) {
        const msg = "仅支持图片文件";
        setError(msg);
        onUploadError?.({ message: msg, code: "INVALID_TYPE" });
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);
      onUploadStart?.();

      const formData = new FormData();
      formData.append("mediaType", mediaType);
      formData.append("file", file);
      if (workspaceId) {
        formData.append("workspaceId", workspaceId);
      }
      if (existingUrl) {
        formData.append("existingUrl", existingUrl);
      }

      try {
        const response = await fetch("/api/dashboard/media", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (result.success) {
          setUploadProgress(100);
          onUploadSuccess?.({
            mediaId: result.mediaId,
            url: result.url,
            mimeType: result.mimeType,
            sizeBytes: result.sizeBytes,
          });
        } else {
          setError(result.error || "上传失败");
          onUploadError?.({ message: result.error || "上传失败", code: result.code });
        }
      } catch (err) {
        const msg = "上传失败，请稍后重试";
        setError(msg);
        onUploadError?.({ message: msg, code: "UPLOAD_FAILED" });
      } finally {
        setIsUploading(false);
      }
    },
    [mediaType, workspaceId, existingUrl, maxFileSize, onUploadStart, onUploadSuccess, onUploadError],
  );

  const handleDelete = useCallback(async () => {
    if (!existingUrl) return;

    try {
      const relativePathMatch = existingUrl.match(new RegExp(`/api/dashboard/media/${mediaType}/([^?]+)`));
      if (!relativePathMatch) {
        onUploadError?.({ message: "无法获取文件路径", code: "INVALID_TYPE" });
        return;
      }
      const relativePath = relativePathMatch[1];

      const response = await fetch("/api/dashboard/media/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaType, relativePath, workspaceId }),
      });

      const result = await response.json();

      if (result.success) {
        onDelete?.();
      } else {
        setError(result.error || "删除失败");
        onUploadError?.({ message: result.error || "删除失败", code: result.code });
      }
    } catch (err) {
      const msg = "删除失败，请稍后重试";
      setError(msg);
      onUploadError?.({ message: msg, code: "DELETE_FAILED" });
    }
  }, [existingUrl, mediaType, workspaceId, onDelete, onUploadError]);

  return (
    <div className="media-uploader">
      {error && (
        <div className="mb-2 px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg">
          {error}
        </div>
      )}

      {existingUrl ? (
        <div className="relative">
          <img
            src={existingUrl}
            alt="预览"
            className="max-h-48 w-auto object-contain rounded-lg border border-gray-200"
          />
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement | null)?.click()}
              disabled={isUploading}
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              替换
            </button>
            <button
              onClick={handleDelete}
              disabled={isUploading}
              className="px-3 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              删除
            </button>
          </div>
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
              <div className="text-white text-sm">
                上传中... {Math.round(uploadProgress)}%
              </div>
            </div>
          )}
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition-colors">
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
          />
          {isUploading ? (
            <div className="text-gray-500">
              <div className="text-sm">上传中... {Math.round(uploadProgress)}%</div>
            </div>
          ) : (
            <>
              <div className="text-gray-400 text-lg">📷</div>
              <div className="text-sm text-gray-500 mt-2">点击或拖拽上传图片</div>
              <div className="text-xs text-gray-400 mt-1">支持 JPG、PNG、WebP、GIF</div>
            </>
          )}
        </label>
      )}

      <input
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading}
      />
    </div>
  );
}
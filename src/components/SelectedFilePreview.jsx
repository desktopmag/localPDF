import React, { useEffect, useRef, useState } from 'react';
import FilePreviewCard from '@/components/FilePreviewCard';
import {
  isPdfFile,
  renderPageThumb,
  rotateDataUrlPreview,
  rotateImageFile,
  rotatePdfFile,
} from '@/lib/pdfUtils';

function isImageFile(file) {
  return file?.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(file?.name || '');
}

async function loadPreview(file) {
  if (isImageFile(file)) {
    return { src: URL.createObjectURL(file), revoke: true };
  }
  if (isPdfFile(file)) {
    const src = await renderPageThumb(file, 1, 0.45);
    return { src, revoke: false };
  }
  return { src: null, revoke: false };
}

export default function SelectedFilePreview({
  file,
  onRemove,
  onFileChange,
  meta,
  showRotate = true,
  className,
}) {
  const [previewSrc, setPreviewSrc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rotating, setRotating] = useState(false);
  const thumbGenRef = useRef(0);
  const objectUrlRef = useRef(null);

  function revokeObjectUrl() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }

  useEffect(() => {
    let cancelled = false;
    const gen = ++thumbGenRef.current;

    if (!file) {
      revokeObjectUrl();
      setPreviewSrc(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    loadPreview(file)
      .then(({ src, revoke }) => {
        if (cancelled || thumbGenRef.current !== gen) return;
        revokeObjectUrl();
        if (revoke) objectUrlRef.current = src;
        setPreviewSrc(src);
      })
      .catch(async () => {
        if (cancelled || thumbGenRef.current !== gen) return;
        // Keep showing the previous thumbnail if pdf.js fails on a re-saved PDF.
      })
      .finally(() => {
        if (!cancelled && thumbGenRef.current === gen) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

  useEffect(() => () => revokeObjectUrl(), []);

  const canRotate = showRotate && !!onFileChange && (isPdfFile(file) || isImageFile(file));

  async function handleRotate() {
    if (!onFileChange || rotating) return;
    setRotating(true);
    const previousPreview = previewSrc;
    try {
      const next = isPdfFile(file)
        ? await rotatePdfFile(file, 90)
        : isImageFile(file)
          ? await rotateImageFile(file, 90)
          : file;

      if (previousPreview) {
        try {
          const rotated = await rotateDataUrlPreview(previousPreview, 90);
          setPreviewSrc(rotated);
        } catch {
          /* fall through — effect will try to render from the new file */
        }
      }

      onFileChange(next);
    } finally {
      setRotating(false);
    }
  }

  return (
    <FilePreviewCard
      fileName={file.name}
      previewSrc={previewSrc}
      previewAlt={file.name}
      loading={loading && !previewSrc}
      onRotate={canRotate ? handleRotate : undefined}
      onRemove={onRemove}
      showRotate={canRotate}
      meta={meta}
      className={className}
    />
  );
}

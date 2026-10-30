import { useCallback, useEffect, useRef, useState } from 'react';
import * as mediaService from '../services/mediaService.js';

// Rodada 7: uploads many files to the Biblioteca, one at a time (20
// parallel 100MB uploads would choke the browser and the server). Each
// finished upload is reported through onUploaded so the grid fills while
// the rest are still sending.
const MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'video/mp4', 'video/quicktime'];
const EXTS = ['.jpg', '.jpeg', '.png', '.mp4', '.mov'];
export const LIBRARY_UPLOAD_MAX_FILES = 50;

function isAccepted(file) {
  if (file.type && MIMES.includes(file.type)) return true;
  const name = (file.name || '').toLowerCase();
  return !file.type && EXTS.some((e) => name.endsWith(e));
}

export function useLibraryUploader({ onUploaded, onFinished }) {
  const [progress, setProgress] = useState(null); // { done, total, name } | null
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const uploadFiles = useCallback(
    async (fileList, { folderId } = {}) => {
      const files = Array.from(fileList || []);
      if (files.length === 0) return;
      const problems = [];
      const valid = files.filter(isAccepted);
      if (valid.length < files.length) {
        problems.push(`${files.length - valid.length} arquivo(s) ignorado(s): use JPG, PNG, MP4 ou MOV.`);
      }
      const toSend = valid.slice(0, LIBRARY_UPLOAD_MAX_FILES);
      if (valid.length > LIBRARY_UPLOAD_MAX_FILES) {
        problems.push(`Máximo de ${LIBRARY_UPLOAD_MAX_FILES} por vez: ${valid.length - LIBRARY_UPLOAD_MAX_FILES} ficaram de fora.`);
      }

      let sent = 0;
      for (let i = 0; i < toSend.length; i++) {
        const file = toSend[i];
        if (mounted.current) setProgress({ done: i, total: toSend.length, name: file.name });
        try {
          const { media } = await mediaService.uploadMediaFile(file, { library: true, folderId });
          sent += 1;
          if (mounted.current) onUploaded?.(media);
        } catch (err) {
          problems.push(`${file.name}: ${err.message || 'falha no upload'}`);
        }
      }
      if (mounted.current) setProgress(null);
      onFinished?.({ sent, problems });
    },
    [onUploaded, onFinished]
  );

  return { progress, uploadFiles, busy: progress !== null };
}
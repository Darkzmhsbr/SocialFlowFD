import { useCallback, useState } from 'react';
import * as mediaService from '../services/mediaService.js';

// Wraps the upload call so components can render "Enviando..." / error
// states without each one reimplementing the try/catch.
export function useMediaUpload() {
  const [status, setStatus] = useState('idle'); // idle | uploading | error
  const [error, setError] = useState(null);

  const upload = useCallback(async (file) => {
    setStatus('uploading');
    setError(null);
    try {
      // Backend returns { success, media: { id, type, url, ... } } at root.
      const { media } = await mediaService.uploadMediaFile(file);
      setStatus('idle');
      return media;
    } catch (err) {
      setError(err.message);
      setStatus('error');
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return { status, error, upload, reset };
}
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
      const res = await mediaService.uploadMediaFile(file);
      setStatus('idle');
      return res.data.media; // { id, type, url, ... }
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
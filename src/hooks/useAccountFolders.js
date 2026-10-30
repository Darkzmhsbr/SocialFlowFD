import { useCallback, useEffect, useState } from 'react';
import * as foldersService from '../services/accountFoldersService.js';

// Rodada 8: the user's profile folders. If the backend doesn't have the
// endpoint yet (deploy order), `folders` just stays empty.
export function useAccountFolders() {
  const [status, setStatus] = useState('loading');
  const [folders, setFolders] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const { folders: list } = await foldersService.listAccountFolders();
      setFolders(list || []);
      setStatus('success');
    } catch (err) {
      setError(err.message);
      setFolders([]);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { status, folders, error, reload: load };
}
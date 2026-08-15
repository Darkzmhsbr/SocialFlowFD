import { useCallback, useEffect, useState } from 'react';
import * as instagramService from '../services/instagramService.js';

// Centralizes the idle/loading/success/error states for the accounts list
// so Dashboard.jsx stays focused on layout instead of data fetching.
export function useInstagramAccounts() {
  const [status, setStatus] = useState('loading'); // idle | loading | success | error
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const { accounts: fetched } = await instagramService.listAccounts();
      setAccounts(fetched);
      setStatus('success');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const disconnect = useCallback(
    async (id) => {
      await instagramService.disconnectAccount(id);
      await load();
    },
    [load]
  );

  return { status, accounts, error, reload: load, disconnect };
}

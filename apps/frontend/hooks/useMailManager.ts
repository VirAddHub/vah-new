import { useCallback, useMemo, useRef, useState } from 'react';
import { mailApi } from '../lib/apiClient';
import type { MailItem, MailItemDetails } from '../types';

const triggerBrowserDownload = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

type SetMailItems = React.Dispatch<React.SetStateAction<MailItem[]>>;

export const useMailManager = (setMailItems: SetMailItems) => {
  const [expandedMailId, setExpandedMailId] = useState<string | null>(null);
  const [mailDetails, setMailDetails] = useState<Record<string, MailItemDetails>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  // one AbortController per mail id to prevent races
  const controllersRef = useRef<Map<string, AbortController>>(new Map());

  const setItemError = useCallback((id: string, message: string | null) => {
    setErrors(prev => ({ ...prev, [id]: message }));
  }, []);

  const cancelInFlight = useCallback((id: string) => {
    const map = controllersRef.current;
    const existing = map.get(id);
    if (existing) {
      existing.abort();
      map.delete(id);
    }
  }, []);

  const newController = useCallback((id: string) => {
    cancelInFlight(id);
    const ctrl = new AbortController();
    controllersRef.current.set(id, ctrl);
    return ctrl;
  }, [cancelInFlight]);

  const handleToggleMail = useCallback(async (item: MailItem) => {
    const id = item.id;
    setItemError(id, null);

    // collapse if open
    if (expandedMailId === id) {
      setExpandedMailId(null);
      return;
    }

    // expand from cache
    if (mailDetails[id]) {
      setExpandedMailId(id);
      return;
    }

    const ctrl = newController(id);
    setLoadingId(id);

    try {
      const res = await mailApi.get(id);
      if (!res.ok) throw new Error(res.error);

      setMailDetails(prev => ({ ...prev, [id]: res.data }));
      setExpandedMailId(id);

      // optimistic mark-as-read (if unread)
      if (item.status === 'unread') {
        // optimistic update
        const prevStatus = item.status;
        setMailItems(prev =>
          prev.map(m => (m.id === id ? { ...m, status: 'read', is_read: true } : m))
        );

        const mark = await mailApi.markRead(id);
        if (!mark.ok) {
          // rollback on failure
          setMailItems(prev =>
            prev.map(m => (m.id === id ? { ...m, status: prevStatus, is_read: prevStatus === 'read' } : m))
          );
          // Let parent component handle toast notifications
        }
      }
    } catch (e: any) {
      if (e?.name === 'CanceledError' || e?.message === 'canceled') return;
      setItemError(id, 'Failed to open mail.');
      setExpandedMailId(null);
    } finally {
      setLoadingId(null);
      controllersRef.current.delete(id);
    }
  }, [expandedMailId, mailDetails, newController, setItemError, setMailItems]);

  const handleDownloadPdf = useCallback(async (id: string) => {
    setItemError(id, null);
    setDownloadingId(id);
    try {
      const blob = await mailApi.downloadScan(id);
      triggerBrowserDownload(blob, `mail-${id}.pdf`);
    } catch (e) {
      setItemError(id, 'Failed to download PDF.');
    } finally {
      setDownloadingId(null);
    }
  }, [setItemError]);

  const api = useMemo(() => ({ handleToggleMail, handleDownloadPdf }), [handleToggleMail, handleDownloadPdf]);

  return {
    expandedMailId,
    mailDetails,
    loadingId,
    downloadingId,
    errors,
    ...api,
  };
};

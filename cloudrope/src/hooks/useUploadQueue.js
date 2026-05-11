import { useState, useRef, useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { uploadFile } from '../store/filesSlice';
import { fetchTrash } from '../store/trashSlice';
import { extractErrorMessage } from '../utils/errors';

// Each queue item shape:
// { id, file, status: 'pending'|'uploading'|'done'|'error', progress: 0, errorMsg: '' }

let idCounter = 0;
function makeId() { return ++idCounter; }

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'application/pdf', 'text/plain']);
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export function useUploadQueue() {
  const dispatch = useDispatch();
  const [queue, setQueue] = useState([]);
  const processingRef = useRef(false);
  // Keep a stable ref to the queue so the processor always sees the latest
  const queueRef = useRef(queue);
  useEffect(() => { queueRef.current = queue; }, [queue]);

  const updateItem = useCallback((id, patch) => {
    setQueue((prev) => prev.map((item) => item.id === id ? { ...item, ...patch } : item));
  }, []);

  const processNext = useCallback(async () => {
    if (processingRef.current) return;

    const pending = queueRef.current.find((i) => i.status === 'pending');
    if (!pending) return;

    processingRef.current = true;
    updateItem(pending.id, { status: 'uploading', progress: 0 });

    const formData = new FormData();
    formData.append('file', pending.file);

    try {
      await dispatch(uploadFile({
        formData,
        onProgress: (evt) => {
          if (evt.total) {
            updateItem(pending.id, { progress: Math.round((evt.loaded / evt.total) * 100) });
          }
        },
      })).unwrap();
      updateItem(pending.id, { status: 'done', progress: 100 });
      // Refresh trash storage count
      dispatch(fetchTrash());
    } catch (err) {
      updateItem(pending.id, {
        status: 'error',
        errorMsg: extractErrorMessage({ response: { data: err } }),
      });
    } finally {
      processingRef.current = false;
      // Yield one tick so queueRef reflects the update before we recurse
      setTimeout(() => processNext(), 0);
    }
  }, [dispatch, updateItem]);

  // Kick off processor whenever queue changes
  useEffect(() => {
    const hasPending = queue.some((i) => i.status === 'pending');
    if (hasPending && !processingRef.current) processNext();
  }, [queue, processNext]);

  const enqueue = useCallback((files) => {
    const fileArray = Array.from(files);
    const valid = [];
    const rejected = [];

    for (const file of fileArray) {
      if (!ALLOWED_MIME.has(file.type)) {
        rejected.push({ name: file.name, reason: `Type "${file.type || 'unknown'}" not allowed` });
      } else if (file.size > MAX_FILE_BYTES) {
        rejected.push({ name: file.name, reason: 'Exceeds 10 MB limit' });
      } else {
        valid.push({ id: makeId(), file, status: 'pending', progress: 0, errorMsg: '' });
      }
    }

    if (valid.length) setQueue((prev) => [...prev, ...valid]);
    return { valid: valid.length, rejected };
  }, []);

  const clearDone = useCallback(() => {
    setQueue((prev) => prev.filter((i) => i.status === 'pending' || i.status === 'uploading'));
  }, []);

  const retryItem = useCallback((id) => {
    setQueue((prev) => prev.map((i) => i.id === id ? { ...i, status: 'pending', progress: 0, errorMsg: '' } : i));
  }, []);

  const removeItem = useCallback((id) => {
    setQueue((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const isActive = queue.some((i) => i.status === 'pending' || i.status === 'uploading');
  const doneCount = queue.filter((i) => i.status === 'done').length;
  const errorCount = queue.filter((i) => i.status === 'error').length;

  return { queue, enqueue, clearDone, retryItem, removeItem, isActive, doneCount, errorCount };
}

import { useState, useRef, useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { uploadFile } from '../store/filesSlice';
import { fetchTrash } from '../store/trashSlice';
import { extractErrorMessage } from '../utils/errors';

// Each queue item shape (state-safe — no functions stored in state):
// { id, file, status: 'pending'|'uploading'|'done'|'error', progress, errorMsg }

let idCounter = 0;
function makeId() { return ++idCounter; }

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'application/pdf', 'text/plain']);
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function useUploadQueue() {
  const dispatch = useDispatch();
  const [queue, setQueue] = useState([]);
  const processingRef = useRef(false);
  const queueRef      = useRef(queue);
  // Store per-item callbacks outside of state to avoid serialisation issues
  const callbacksRef  = useRef({});

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
      const result = await dispatch(uploadFile({
        formData,
        onProgress: (evt) => {
          if (evt.total) {
            updateItem(pending.id, { progress: Math.round((evt.loaded / evt.total) * 100) });
          }
        },
      })).unwrap();

      updateItem(pending.id, { status: 'done', progress: 100 });
      dispatch(fetchTrash());

      // Fire optional per-item callback (e.g. auto-share after upload)
      const cb = callbacksRef.current[pending.id];
      if (cb) {
        try { await cb(result); } catch (_) { /* don't break queue on callback error */ }
        delete callbacksRef.current[pending.id];
      }
    } catch (err) {
      updateItem(pending.id, {
        status: 'error',
        errorMsg: extractErrorMessage({ response: { data: err } }),
      });
    } finally {
      processingRef.current = false;
      setTimeout(() => processNext(), 0);
    }
  }, [dispatch, updateItem]);

  useEffect(() => {
    const hasPending = queue.some((i) => i.status === 'pending');
    if (hasPending && !processingRef.current) processNext();
  }, [queue, processNext]);

  /**
   * @param {FileList|File[]} files
   * @param {{ onComplete?: (uploadedFile: object) => void }} options
   */
  const enqueue = useCallback((files, { onComplete } = {}) => {
    const fileArray = Array.from(files);
    const valid = [];
    const rejected = [];

    for (const file of fileArray) {
      if (!ALLOWED_MIME.has(file.type)) {
        rejected.push({ name: file.name, reason: `Type "${file.type || 'unknown'}" not allowed` });
      } else if (file.size > MAX_FILE_BYTES) {
        rejected.push({ name: file.name, reason: 'Exceeds 10 MB limit' });
      } else {
        const id = makeId();
        if (onComplete) callbacksRef.current[id] = onComplete;
        valid.push({ id, file, status: 'pending', progress: 0, errorMsg: '' });
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
    delete callbacksRef.current[id];
    setQueue((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const isActive   = queue.some((i) => i.status === 'pending' || i.status === 'uploading');
  const doneCount  = queue.filter((i) => i.status === 'done').length;
  const errorCount = queue.filter((i) => i.status === 'error').length;

  return { queue, enqueue, clearDone, retryItem, removeItem, isActive, doneCount, errorCount };
}

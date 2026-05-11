import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { filesAPI } from '../api/files';

export const fetchFiles = createAsyncThunk('files/fetchFiles', async (_, { rejectWithValue }) => {
  try {
    const { data } = await filesAPI.list();
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data);
  }
});

export const uploadFile = createAsyncThunk('files/uploadFile', async ({ formData, onProgress }, { rejectWithValue }) => {
  try {
    const { data } = await filesAPI.upload(formData, onProgress);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data);
  }
});

export const deleteFile = createAsyncThunk('files/deleteFile', async (id, { rejectWithValue }) => {
  try {
    await filesAPI.delete(id);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data);
  }
});

export const shareFile = createAsyncThunk('files/shareFile', async ({ id, options }, { rejectWithValue }) => {
  try {
    const { data } = await filesAPI.share(id, options);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data);
  }
});

const filesSlice = createSlice({
  name: 'files',
  initialState: {
    items: [],
    status: 'idle', // idle | loading | succeeded | failed
    error: null,
    uploadProgress: 0,
    uploadStatus: 'idle',
  },
  reducers: {
    setUploadProgress(state, action) {
      state.uploadProgress = action.payload;
    },
    resetUpload(state) {
      state.uploadProgress = 0;
      state.uploadStatus = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFiles.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchFiles.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchFiles.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(uploadFile.pending, (state) => { state.uploadStatus = 'loading'; })
      .addCase(uploadFile.fulfilled, (state, action) => {
        state.uploadStatus = 'succeeded';
        state.items = [action.payload, ...state.items];
        state.uploadProgress = 0;
      })
      .addCase(uploadFile.rejected, (state) => {
        state.uploadStatus = 'failed';
        state.uploadProgress = 0;
      })
      .addCase(deleteFile.fulfilled, (state, action) => {
        state.items = state.items.filter((f) => f.id !== action.payload);
      });
  },
});

export const { setUploadProgress, resetUpload } = filesSlice.actions;
export default filesSlice.reducer;

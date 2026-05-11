import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { filesAPI } from '../api/files';

export const fetchTrash = createAsyncThunk('trash/fetchTrash', async (_, { rejectWithValue }) => {
  try {
    const { data } = await filesAPI.trash();
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data);
  }
});

export const restoreFile = createAsyncThunk('trash/restoreFile', async (id, { rejectWithValue }) => {
  try {
    await filesAPI.restore(id);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data);
  }
});

export const permanentDeleteFile = createAsyncThunk('trash/permanentDeleteFile', async (id, { rejectWithValue }) => {
  try {
    await filesAPI.permanentDelete(id);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data);
  }
});

const trashSlice = createSlice({
  name: 'trash',
  initialState: {
    items: [],
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTrash.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchTrash.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchTrash.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(restoreFile.fulfilled, (state, action) => {
        state.items = state.items.filter((f) => f.id !== action.payload);
      })
      .addCase(permanentDeleteFile.fulfilled, (state, action) => {
        state.items = state.items.filter((f) => f.id !== action.payload);
      });
  },
});

export default trashSlice.reducer;

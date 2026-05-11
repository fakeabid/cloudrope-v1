import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { filesAPI } from '../api/files';

export const fetchShares = createAsyncThunk('shares/fetchShares', async (_, { rejectWithValue }) => {
  try {
    const { data } = await filesAPI.listShares();
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data);
  }
});

export const revokeShare = createAsyncThunk('shares/revokeShare', async (id, { rejectWithValue }) => {
  try {
    await filesAPI.revokeShare(id);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data);
  }
});

const sharesSlice = createSlice({
  name: 'shares',
  initialState: {
    items: [],
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchShares.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchShares.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchShares.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(revokeShare.fulfilled, (state, action) => {
        state.items = state.items.map((s) =>
          s.id === action.payload ? { ...s, status: 'revoked' } : s
        );
      });
  },
});

export default sharesSlice.reducer;

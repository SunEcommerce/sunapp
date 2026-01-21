import { createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Category {
  id: number;
  name: string;
  name_mm?: string;
  slug: string;
  icon?: string;
  image?: string;
  parent_id?: number | null;
  children?: Category[];
  [key: string]: any;
}

interface CategoriesState {
  tree: Category[];
  flatList: Category[];
  lastUpdated: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: CategoriesState = {
  tree: [],
  flatList: [],
  lastUpdated: null,
  isLoading: false,
  error: null,
};

const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    setCategoriesTree: (state, action: PayloadAction<Category[]>) => {
      state.tree = action.payload;
      state.lastUpdated = new Date().toISOString();
      state.error = null;
    },
    setFlatCategories: (state, action: PayloadAction<Category[]>) => {
      state.flatList = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    clearCategories: (state) => {
      state.tree = [];
      state.flatList = [];
      state.lastUpdated = null;
      state.error = null;
    },
  },
});

export const { 
  setCategoriesTree, 
  setFlatCategories, 
  setLoading, 
  setError, 
  clearCategories 
} = categoriesSlice.actions;

export default categoriesSlice.reducer;

// Base Selectors
export const selectCategoriesTree = (state: { categories: CategoriesState }) => state.categories.tree;
export const selectFlatCategories = (state: { categories: CategoriesState }) => state.categories.flatList;
export const selectCategoriesLoading = (state: { categories: CategoriesState }) => state.categories.isLoading;
export const selectCategoriesError = (state: { categories: CategoriesState }) => state.categories.error;
export const selectLastUpdated = (state: { categories: CategoriesState }) => state.categories.lastUpdated;

// Memoized Selectors
export const selectParentCategories = createSelector(
  [selectCategoriesTree],
  (tree) => tree.filter(cat => !cat.parent_id || cat.parent_id === null)
);

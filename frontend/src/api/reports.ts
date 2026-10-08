import apiClient from './client';
import type { MonthReport, UpdateReportCategoryPayload, UploadStatementResult, YearOverview } from '@/types/report';

/** Parsing is deterministic (no AI), but a large PDF upload on mobile data can still take a while */
const UPLOAD_TIMEOUT_MS = 60000;

export const reportsApi = {
  /** Store a monthly statement PDF; re-uploading a month replaces it */
  uploadStatement: async (file: File): Promise<UploadStatementResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<UploadStatementResult>('/reports/statements', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT_MS
    });
    return response.data;
  },

  /** Which months are imported/missing, year totals and year-level suggestions */
  year: async (year: number): Promise<YearOverview> => {
    const response = await apiClient.get<YearOverview>(`/reports/year/${year}`);
    return response.data;
  },

  /** Full report for one imported month (period YYYY-MM) */
  month: async (period: string): Promise<MonthReport> => {
    const response = await apiClient.get<MonthReport>(`/reports/month/${period}`);
    return response.data;
  },

  /** Correct the category of one row or of every row of a merchant */
  updateCategory: async (payload: UpdateReportCategoryPayload): Promise<void> => {
    await apiClient.patch('/reports/categories', payload);
  }
};

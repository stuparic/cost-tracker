import apiClient from './client';
import type { ImportStatementPayload, ImportStatementResult, ParseStatementResult } from '@/types/statement';

/** AI parsing of an 8-page statement takes ~1 minute - far above the default client timeout */
const PARSE_TIMEOUT_MS = 180000;

export const statementApi = {
  /**
   * Upload a bank statement PDF; returns extracted transactions annotated
   * with duplicate-detection status.
   */
  parse: async (file: File): Promise<ParseStatementResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ParseStatementResult>('/statements/parse', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: PARSE_TIMEOUT_MS
    });
    return response.data;
  },

  /** Import the reviewed transactions as expenses/incomes (idempotent per bank reference) */
  import: async (payload: ImportStatementPayload): Promise<ImportStatementResult> => {
    const response = await apiClient.post<ImportStatementResult>('/statements/import', payload, {
      timeout: PARSE_TIMEOUT_MS
    });
    return response.data;
  }
};

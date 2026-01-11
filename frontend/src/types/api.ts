export interface SuggestionItem {
  value: string;
  count: number;
}

export interface AutocompleteResponse {
  suggestions: SuggestionItem[];
}

export interface ApiError {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string;
}

import axios from "axios";

// Environment configuration with fallback (match project pattern)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8010/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    // Let axios set the multipart boundary when FormData is used
    Accept: 'application/json',
  },
});

// Expected server response shape (based on example provided by user)
export interface UploadResult {
  status: string; // e.g. 'written'
  rows?: number;
  columns?: number;
}

export interface UploadDocumentResponse {
  timestamp?: number;
  status?: string; // e.g. 'success'
  result?: UploadResult;
}

// Upload a file as multipart/form-data to /upload-document
export async function uploadDocument(file: File): Promise<UploadDocumentResponse> {
  const form = new FormData();
  form.append('file', file, file.name);

  try {
    const resp = await api.post<UploadDocumentResponse>('/upload-document', form, {
      headers: {
        // Don't set Content-Type here; let the browser/axios set the correct boundary
      },
    });

    return resp.data;
  } catch (err: any) {
    console.error('uploadDocument error:', err?.response || err.message || err);
    // Re-throw a normalized error so callers can handle it
    throw new Error(err?.response?.data?.message || err?.message || 'Upload failed');
  }
}

export default {
  uploadDocument,
};

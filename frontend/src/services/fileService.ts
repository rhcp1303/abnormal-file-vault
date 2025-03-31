import axios from 'axios';
import { File as FileType } from '../types/file';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export interface StorageStatistics {
  unique_storage_used: number;
  total_storage_if_duplicates: number;
  storage_savings: number;
}

interface GetFilesParams {
  search?: string;
  file_type?: string;
  min_size?: number;
  max_size?: number;
  uploaded_at_min?: string; // ISO 8601 date string
  uploaded_at_max?: string; // ISO 8601 date string
}

export const fileService = {
  async uploadFile(file: File): Promise<FileType> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(`${API_URL}/files/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getFiles(params?: GetFilesParams): Promise<FileType[]> {
    const response = await axios.get(`${API_URL}/files/`, {
      params: params,
    });
    return response.data;
  },

  async deleteFile(id: string): Promise<void> {
    await axios.delete(`${API_URL}/files/${id}/`);
  },

  async downloadFile(fileUrl: string, filename: string): Promise<void> {
    try {
      const response = await axios.get(fileUrl, {
        responseType: 'blob',
      });

      // Create a blob URL and trigger download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      throw new Error('Failed to download file');
    }
  },

  async getStorageStatistics(): Promise<StorageStatistics> {
    try {
      const response = await axios.get(`${API_URL}/files/storage_statistics/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching storage statistics:', error);
      throw new Error('Failed to fetch storage statistics');
    }
  },
};

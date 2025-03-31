// frontend/src/components/FileList.tsx
import React, { useEffect, useState } from 'react';
import { fileService, StorageStatistics } from '../services/fileService';
import { File as FileType } from '../types/file';
import {
  DocumentIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import filesize from 'filesize';
import { format } from 'date-fns';

export const FileList: React.FC = () => {
  const queryClient = useQueryClient();
  const [storageStats, setStorageStats] = useState<StorageStatistics | null>(null);
  const [storageStatsLoading, setStorageStatsLoading] = useState(true);
  const [storageStatsError, setStorageStatsError] = useState<Error | null>(null);

  // Search and Filter State
  const [search, setSearch] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('');
  const [minSizeFilter, setMinSizeFilter] = useState<number | undefined>(undefined);
  const [maxSizeFilter, setMaxSizeFilter] = useState<number | undefined>(undefined);
  const [uploadDateMinFilter, setUploadDateMinFilter] = useState<string | undefined>(undefined);
  const [uploadDateMaxFilter, setUploadDateMaxFilter] = useState<string | undefined>(undefined);

  const {
    data: files,
    isLoading: filesLoading,
    error: filesError,
    refetch: refetchFiles,
  } = useQuery<FileType[], Error>({
    queryKey: [
      'files',
      search,
      fileTypeFilter,
      minSizeFilter,
      maxSizeFilter,
      uploadDateMinFilter,
      uploadDateMaxFilter,
    ],
    queryFn: () =>
      fileService.getFiles({
        search: search,
        file_type: fileTypeFilter,
        min_size: minSizeFilter,
        max_size: maxSizeFilter,
        uploaded_at_min: uploadDateMinFilter,
        uploaded_at_max: uploadDateMaxFilter,
      }),
    enabled: false, // Disable initial fetch, will trigger on Enter or initial load
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      refetchFiles();
    }
  };

  // useEffect to fetch data when filters change (excluding search) or on initial load
  useEffect(() => {
    refetchFiles();
  }, [fileTypeFilter, minSizeFilter, maxSizeFilter, uploadDateMinFilter, uploadDateMaxFilter]);

  // Mutation for deleting files
   const deleteMutation = useMutation({
    mutationFn: fileService.deleteFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] }).then(() => {
        refetchFiles(); // Call refetchFiles after invalidation is complete
      });
      fetchStorageStats();
    },
    onError: (error) => {
      console.error('Delete error:', error);
    },
  });

  // Mutation for downloading files
  const downloadMutation = useMutation({
    mutationFn: ({ fileUrl, filename }: { fileUrl: string; filename: string }) =>
      fileService.downloadFile(fileUrl, filename),
    onError: (error) => {
      console.error('Download error:', error);
    },
  });

  useEffect(() => {
    fetchStorageStats();
  }, []);

  const fetchStorageStats = async () => {
    setStorageStatsLoading(true);
    setStorageStatsError(null);
    try {
      const data = await fileService.getStorageStatistics();
      setStorageStats(data);
    } catch (error: any) {
      console.error('Error fetching storage stats:', error);
      setStorageStatsError(error);
    } finally {
      setStorageStatsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (err) {
        console.error('Delete error:', err);
      }
    }
  };

  const handleDownload = async (fileUrl: string, filename: string) => {
    try {
      await downloadMutation.mutateAsync({ fileUrl, filename });
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  if (filesLoading || storageStatsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (filesError || storageStatsError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">Failed to load data. Please try again.</p>
              {filesError && <p className="text-sm text-red-700">File Load Error: {filesError.message}</p>}
              {storageStatsError && (
                <p className="text-sm text-red-700">Storage Stats Error: {storageStatsError.message}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Uploaded Files</h2>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700">
            Search Filename:
          </label>
          <div className="relative mt-1">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              name="search"
              id="search"
              className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
              placeholder="Search by filename"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown} // Added onKeyDown handler
            />
          </div>
        </div>
        <div>
          <label htmlFor="file-type" className="block text-sm font-medium text-gray-700">
            Filter by File Type:
          </label>
          <select
            id="file-type"
            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            value={fileTypeFilter}
            onChange={(e) => setFileTypeFilter(e.target.value)}
          >
            <option value="">All File Types</option>
            {/* Dynamically populate options based on available file types if needed */}
            <option value="application/pdf">PDF</option>
            <option value="image/jpeg">JPEG</option>
            <option value="image/png">PNG</option>
            {/* Add more options as needed */}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Filter by Size:</label>
          <div className="mt-1 flex space-x-2">
            <input
              type="number"
              className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-1/2 sm:text-sm border-gray-300 rounded-md"
              placeholder="Min Size (KB)"
              value={minSizeFilter === undefined ? '' : minSizeFilter}
              onChange={(e) => setMinSizeFilter(e.target.value === '' ? undefined : parseInt(e.target.value))}
            />
            <input
              type="number"
              className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-1/2 sm:text-sm border-gray-300 rounded-md"
              placeholder="Max Size (KB)"
              value={maxSizeFilter === undefined ? '' : maxSizeFilter}
              onChange={(e) => setMaxSizeFilter(e.target.value === '' ? undefined : parseInt(e.target.value))}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Filter by Upload Date:</label>
          <div className="mt-1 flex space-x-2">
            <input
              type="date"
              className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-1/2 sm:text-sm border-gray-300 rounded-md"
              value={uploadDateMinFilter || ''}
              onChange={(e) => setUploadDateMinFilter(e.target.value || undefined)}
            />
            <input
              type="date"
              className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-1/2 sm:text-sm border-gray-300 rounded-md"
              value={uploadDateMaxFilter || ''}
              onChange={(e) => setUploadDateMaxFilter(e.target.value || undefined)}
            />
          </div>
        </div>
      </div>

      {storageStats && (
        <div className="bg-gray-50 rounded-md p-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Storage Statistics</h3>
          <p className="text-sm text-gray-700">
            Unique Storage Used: {filesize(storageStats.unique_storage_used)}
          </p>
          <p className="text-sm text-gray-700">
            Total Storage (including duplicates): {filesize(storageStats.total_storage_if_duplicates)}
          </p>
          <p className="text-sm text-gray-700">Storage Savings: {filesize(storageStats.storage_savings)}</p>
        </div>
      )}

      {!files || files?.length === 0 ? (
        <div className="text-center py-12">
          <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No files</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by uploading a file</p>
        </div>
      ) : (
        <div className="mt-6 flow-root">
          <ul className="-my-5 divide-y divide-gray-200">
            {files && files.map((file: FileType) => (
              <li key={file.id} className="py-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <DocumentIcon className="h-8 w-8 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.original_filename}
                    </p>
                    <p className="text-sm text-gray-500">
                      {file.file_type} • {filesize(file.size)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Uploaded {format(new Date(file.uploaded_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDownload(file.file, file.original_filename)}
                      disabled={downloadMutation.isPending}
                      className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(file.id)}
                      disabled={deleteMutation.isPending}
                      className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileList;
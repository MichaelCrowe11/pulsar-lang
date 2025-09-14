'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { DocumentTextIcon, CloudArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useAppStore } from '@/lib/store'
import { DocumentInfo } from '@/types'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import ProgressBar from '@/components/ui/ProgressBar'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function DocumentUpload() {
  const { uploadedFiles, uploadProgress, setUploadedFiles, setUploadProgress } = useAppStore()
  const [dragActive, setDragActive] = useState(false)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const fileInfos: DocumentInfo[] = acceptedFiles.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      }))

      setUploadedFiles([...uploadedFiles, ...fileInfos])
      toast.success(`${acceptedFiles.length} file(s) uploaded successfully`)
    },
    [uploadedFiles, setUploadedFiles]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    onError: (error) => toast.error(`Upload error: ${error.message}`),
  })

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index)
    setUploadedFiles(newFiles)
    toast.success('File removed')
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const startAnalysis = async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Please upload at least one document')
      return
    }

    setUploadProgress({
      progress: 10,
      status: 'processing',
      message: 'Preparing documents for analysis...'
    })

    // Simulate analysis progress
    const steps = [
      { progress: 25, message: 'Extracting text from documents...' },
      { progress: 50, message: 'Running AI analysis...' },
      { progress: 75, message: 'Generating insights...' },
      { progress: 100, message: 'Analysis complete!' }
    ]

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 1500))
      setUploadProgress({
        progress: step.progress,
        status: step.progress === 100 ? 'complete' : 'processing',
        message: step.message
      })
    }

    toast.success('Analysis completed successfully!')
  }

  return (
    <div className="space-y-6">
      <Card>
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200',
            isDragActive || dragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          )}
        >
          <input {...getInputProps()} />
          <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-lg font-medium text-gray-900">
            {isDragActive ? 'Drop files here' : 'Upload Financial Documents'}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Drag and drop your files here, or click to browse
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Supports PDF, TXT, CSV files up to 50MB
          </p>
        </div>
      </Card>

      {uploadedFiles.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Uploaded Documents</h3>
            <span className="text-sm text-gray-500">
              {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="space-y-3">
            {uploadedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <DocumentTextIcon className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                  title="Remove file"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t">
            <Button
              onClick={startAnalysis}
              disabled={uploadProgress.status === 'processing'}
              isLoading={uploadProgress.status === 'processing'}
              className="w-full"
            >
              {uploadProgress.status === 'processing' ? 'Analyzing...' : 'Start Analysis'}
            </Button>
          </div>
        </Card>
      )}

      {uploadProgress.status !== 'idle' && (
        <Card>
          <h3 className="text-lg font-semibold mb-4">Analysis Progress</h3>
          <ProgressBar
            progress={uploadProgress.progress}
            color={uploadProgress.status === 'complete' ? 'green' : 'blue'}
            animated={uploadProgress.status === 'processing'}
          />
          <p className="mt-2 text-sm text-gray-600">{uploadProgress.message}</p>
        </Card>
      )}
    </div>
  )
}
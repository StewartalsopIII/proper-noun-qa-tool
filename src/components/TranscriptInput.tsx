'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface TranscriptInputProps {
  onTranscriptSubmit: (transcript: string) => void;
  isLoading: boolean;
}

const TranscriptInput: React.FC<TranscriptInputProps> = ({ onTranscriptSubmit, isLoading }) => {
  const [transcriptText, setTranscriptText] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setTranscriptText(text);
      };
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        // TODO: Add user-facing error message
      };
      reader.readAsText(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/vtt': ['.vtt'],
      'text/srt': ['.srt'],
    },
    multiple: false,
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (transcriptText.trim()) {
      onTranscriptSubmit(transcriptText);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="transcriptArea" className="block text-sm font-medium text-gray-700 mb-2">
            Paste Transcript Text:
          </label>
          <textarea
            id="transcriptArea"
            rows={10}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            value={transcriptText}
            onChange={(e) => {
              setTranscriptText(e.target.value);
              setFileName(null); // Clear file name if user types
            }}
            placeholder="Paste your transcript here..."
            disabled={isLoading}
          />
        </div>

        <div className="text-center my-4 text-gray-500">OR</div>

        <div
          {...getRootProps()}
          className={`p-6 border-2 border-dashed rounded-md text-center cursor-pointer ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'} ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} disabled={isLoading} />
          {fileName ? (
            <p className="text-gray-700">Selected file: {fileName}</p>
          ) : isDragActive ? (
            <p className="text-indigo-600">Drop the transcript file here ...</p>
          ) : (
            <p className="text-gray-500">Drag 'n' drop a .txt, .md, .vtt, or .srt file here, or click to select file</p>
          )}
        </div>

        <div className="mt-6 text-center">
          <button
            type="submit"
            disabled={!transcriptText.trim() || isLoading}
            className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isLoading ? 'Processing...' : 'Analyze Transcript'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TranscriptInput;

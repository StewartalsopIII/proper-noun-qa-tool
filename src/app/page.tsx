'use client';

import { useState } from 'react';
import TranscriptInput from '@/components/TranscriptInput';
import QAInterface from '@/components/QAInterface'; // Placeholder import
import { NounCorrection } from '@/app/api/identify-nouns/route'; // Import the interface
import { CorrectionUpdateData } from '@/components/CorrectionCard'; // Import the type
import axios from 'axios';

type AppStep = 'input' | 'qa' | 'export';

export default function Home() {
  const [currentStep, setCurrentStep] = useState<AppStep>('input');
  const [transcript, setTranscript] = useState<string>('');
  const [corrections, setCorrections] = useState<NounCorrection[]>([]);
  const [correctedTranscript, setCorrectedTranscript] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleTranscriptSubmit = async (submittedTranscript: string) => {
    setIsLoading(true);
    setError(null);
    setTranscript(submittedTranscript);
    setCorrections([]); // Clear previous corrections

    try {
      const response = await axios.post('/api/identify-nouns', {
        transcript: submittedTranscript,
      });

      // Basic validation: Ensure the response data is an array
      if (Array.isArray(response.data)) {
        // Further validation could be added here to check item structure
        setCorrections(response.data);
        setCurrentStep('qa');
      } else {
        console.error('API did not return an array:', response.data);
        setError('Received invalid data format from the server. Please try again.');
        setCurrentStep('input'); // Stay on input page on error
      }

    } catch (err) {
      console.error('Error calling identify-nouns API:', err);
      let message = 'An unknown error occurred.';
      if (axios.isAxiosError(err) && err.response) {
        message = err.response.data?.error || err.message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(`Failed to analyze transcript: ${message}`);
      setCurrentStep('input'); // Go back to input on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBackToInput = () => {
    setCurrentStep('input');
    setTranscript('');
    setCorrections([]);
    setError(null);
  };

  // TODO: Implement handleCorrectionsComplete in Phase 5
  // Updated to receive CorrectionUpdateData[]
  const handleCorrectionsComplete = (finalUpdateData: CorrectionUpdateData[]) => {
    console.log('Corrections submitted from QA:', finalUpdateData);

    // --- Apply Corrections (Using explicit initial/final words) ---
    let updatedTranscript = transcript; // Start with the original

    finalUpdateData.forEach(data => {
      // data.updatedCorrection should not be null here due to filtering in QAInterface
      if (data.updatedCorrection) { 
        const originalWordToFind = data.initialWord;
        const newWord = data.updatedCorrection.original_word; // This is the final word

        if (originalWordToFind && originalWordToFind !== newWord) {
            console.log(`Replacing first instance of '${originalWordToFind}' with '${newWord}'`);
            // Replace only the first occurrence to minimize incorrect replacements
            // Use a regex with word boundary ('\b') if possible, but simple replace for now
            updatedTranscript = updatedTranscript.replace(originalWordToFind, newWord);
        } else {
            // Log if original and new are the same (no change needed)
            if (originalWordToFind === newWord) {
                console.log(`No change for '${originalWordToFind}'`);
            }
        }
      }
    });

    setCorrectedTranscript(updatedTranscript);
    // --------------------------------------------------------------

    setCurrentStep('export'); 
  };

  // --- Download Helper ---
  const downloadMarkdown = () => {
    if (!correctedTranscript) return;

    const blob = new Blob([correctedTranscript], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'corrected_transcript.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-6 md:p-12 bg-gray-50">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800">
        Proper Noun QA Tool
      </h1>

      {error && (
        <div className="w-full max-w-3xl mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <p><strong>Error:</strong> {error}</p>
          <button onClick={() => setError(null)} className="ml-2 text-sm font-semibold underline">Dismiss</button>
        </div>
      )}

      {currentStep === 'input' && (
        <TranscriptInput 
          onTranscriptSubmit={handleTranscriptSubmit} 
          isLoading={isLoading} 
        />
      )}

      {currentStep === 'qa' && (
        // QAInterface will be implemented in Phase 4
        // For now, show a placeholder or basic info
        <div className="w-full max-w-6xl">
          <button 
            onClick={handleGoBackToInput}
            className="mb-4 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
          >
            &larr; Back to Input
          </button>
          <h2 className="text-xl font-semibold mb-4">Review Suggestions</h2>
          {/* Temporary display - replace with QAInterface */}
          {/* <p>Transcript loaded. {corrections.length} potential corrections identified (API returned dummy data for now).</p> */}
          {/* <pre className="mt-4 p-4 bg-white border rounded text-sm max-h-96 overflow-auto">{JSON.stringify(corrections, null, 2)}</pre> */}
           
            <QAInterface
              potentialCorrections={corrections}
              onComplete={handleCorrectionsComplete}
            /> 
          {/* */}
        </div>
      )}

      {currentStep === 'export' && (
        // Export view will be implemented in Phase 5
        <div className="w-full max-w-4xl text-center">
           <button 
            onClick={handleGoBackToInput}
            className="mb-4 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
          >
            &larr; Start Over
          </button>
          <h2 className="text-xl font-semibold mb-4">Export Corrected Transcript</h2>
          {/* Display corrected transcript in a textarea */}
          <textarea
            readOnly
            value={correctedTranscript}
            className="w-full h-96 p-3 border border-gray-300 rounded-md bg-white text-left font-mono text-sm mb-4 text-gray-900"
            placeholder="Corrected transcript will appear here..."
          />
          {/* Add Export component/buttons here */}
          <button
            onClick={downloadMarkdown}
            disabled={!correctedTranscript}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md shadow hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            Download .md File
          </button>
        </div>
      )}
    </main>
  );
}

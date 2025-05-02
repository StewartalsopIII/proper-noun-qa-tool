'use client';

import React, { useState, useEffect } from 'react';
import { NounCorrection } from '@/app/api/identify-nouns/route';
import CorrectionCard, { CorrectionUpdateData } from './CorrectionCard';

interface QAInterfaceProps {
  originalTranscript: string; // Keep original for context if needed later
  potentialCorrections: NounCorrection[];
  onComplete: (finalUpdateData: CorrectionUpdateData[]) => void;
}

const QAInterface: React.FC<QAInterfaceProps> = ({ 
  originalTranscript, 
  potentialCorrections, 
  onComplete 
}) => {
  const [currentUpdateData, setCurrentUpdateData] = useState<CorrectionUpdateData[]>([]);

  useEffect(() => {
    const initialData = potentialCorrections.map(correction => ({
        initialWord: correction.original_word,
        updatedCorrection: correction
    }));
    setCurrentUpdateData(initialData);
  }, [potentialCorrections]);

  const handleCorrectionUpdate = (index: number, updateData: CorrectionUpdateData) => {
    console.log(`[QAInterface] handleCorrectionUpdate called for index: ${index} with data:`, updateData); // DEBUG LOG
    setCurrentUpdateData(prev => {
      console.log('[QAInterface] Previous state:', prev); // DEBUG LOG
      const newData = [...prev];
      if (updateData.updatedCorrection === null) {
        // Ensure we handle the case where the update might be null (for ignore)
        // even though this specific flow is for suggestion selection.
        console.log(`[QAInterface] Setting item at index ${index} to null (ignored).`); // DEBUG LOG
        newData[index] = { ...newData[index], updatedCorrection: null }; 
      } else {
         console.log(`[QAInterface] Updating item at index ${index} with new word: \'${updateData.updatedCorrection.original_word}\'`); // DEBUG LOG
        newData[index] = updateData;
      }
      console.log('[QAInterface] New state (before setting):', newData); // DEBUG LOG
      return newData;
    });
  };

  const handleFinishReview = () => {
    const finalData = currentUpdateData.filter(data => data.updatedCorrection !== null);
    console.log("Finishing review with data:", finalData);
    onComplete(finalData); 
  };

  return (
    <div className="w-full">
      {currentUpdateData.filter(d => d.updatedCorrection !== null).length === 0 ? (
        <div className="text-center p-6 bg-gray-100 rounded-lg">
          <p className="text-lg font-medium text-gray-700">No corrections to review.</p>
           <button
             onClick={handleFinishReview}
             className="mt-4 px-6 py-2 bg-green-600 text-white font-semibold rounded-md shadow hover:bg-green-700 transition-colors duration-200"
           >
             Complete
           </button>
        </div>
      ) : (
        <>
          {currentUpdateData.map((data, index) => (
            data.updatedCorrection && (
              <CorrectionCard 
                key={index}
                correction={data.updatedCorrection}
                onUpdate={(updatedData) => handleCorrectionUpdate(index, updatedData)}
              />
            )
          ))}
          <div className="mt-6 text-center">
            <button
              onClick={handleFinishReview}
              className="px-8 py-3 bg-green-600 text-white font-semibold rounded-md shadow hover:bg-green-700 transition-colors duration-200 text-lg"
            >
              Finish Review & Proceed
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default QAInterface;

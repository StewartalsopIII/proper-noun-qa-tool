'use client';

import React, { useState, useEffect } from 'react';
import { NounCorrection } from '@/app/api/identify-nouns/route';

export interface CorrectionUpdateData {
  initialWord: string;
  updatedCorrection: NounCorrection | null; // null means ignore
}

interface CorrectionCardProps {
  correction: NounCorrection;
  onUpdate: (updateData: CorrectionUpdateData) => void;
}

const CorrectionCard: React.FC<CorrectionCardProps> = ({ correction, onUpdate }) => {
  const [manualEditValue, setManualEditValue] = useState<string>(correction.original_word);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const initialWordForUpdate = correction.original_word; // Capture initial word for updates

  // Ensure suggestions is always an array to prevent runtime errors
  const suggestionsArray: string[] = Array.isArray(correction.suggestions)
    ? correction.suggestions
    : (correction.suggestions ? [correction.suggestions] : []);

  useEffect(() => {
    if (!isEditing) {
      setManualEditValue(correction.original_word);
    }
  }, [correction.original_word, isEditing]);

  const handleSelectSuggestion = (suggestion: string) => {
    console.log(`[CorrectionCard] handleSelectSuggestion called with suggestion: '${suggestion}' for initial word: '${initialWordForUpdate}'`); // DEBUG LOG
    const updatePayload: CorrectionUpdateData = {
      initialWord: initialWordForUpdate,
      updatedCorrection: { ...correction, original_word: suggestion }
    };
    console.log('[CorrectionCard] Calling onUpdate with payload:', updatePayload); // DEBUG LOG
    onUpdate(updatePayload);
    if (isEditing) {
      setIsEditing(false);
    }
  };

  const handleEditChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setManualEditValue(event.target.value);
  };

  const handleSaveEdit = () => {
    console.log(`Saved edit: ${manualEditValue} for ${initialWordForUpdate}`);
    onUpdate({
      initialWord: initialWordForUpdate,
      updatedCorrection: { ...correction, original_word: manualEditValue }
    });
    setIsEditing(false);
  };

  const handleIgnore = () => {
    console.log(`Ignored suggestion for: ${initialWordForUpdate}`);
    onUpdate({
      initialWord: initialWordForUpdate,
      updatedCorrection: null
    });
    if (isEditing) {
      setIsEditing(false);
    }
  };

  const handleStartEdit = () => {
    setManualEditValue(correction.original_word);
    setIsEditing(true);
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200 mb-4">
      <div className="mb-3">
        <p className="text-sm text-gray-600 mb-1">Original Word (at {correction.timestamp || 'N/A'}):</p>
        <p className="text-lg font-medium text-red-600 bg-red-50 px-2 py-1 rounded inline-block">{correction.original_word}</p>
      </div>

      <div className="mb-3">
        <p className="text-sm text-gray-600 mb-1">Context:</p>
        <p className="text-gray-800 bg-gray-50 p-2 rounded italic">...{correction.context_snippet}...</p>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-1">Suggestions:</p>
        <div className="flex flex-wrap gap-2">
          {suggestionsArray.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSelectSuggestion(suggestion)}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors text-sm"
            >
              {suggestion}
            </button>
          ))}
          {suggestionsArray.length === 0 && <p className="text-sm text-gray-500">No suggestions available.</p>}
        </div>
      </div>

      <div className="mb-4">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={manualEditValue}
              onChange={handleEditChange}
              className="flex-grow p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            />
            <button
              onClick={handleSaveEdit}
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={handleStartEdit}
            className="px-3 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 transition-colors text-sm"
          >
            Edit Manually
          </button>
        )}
      </div>

      <div>
        <button
          onClick={handleIgnore}
          className="px-3 py-1 text-red-600 hover:bg-red-50 rounded transition-colors text-sm font-medium"
        >
          Ignore Suggestion
        </button>
      </div>
    </div>
  );
};

export default CorrectionCard; 
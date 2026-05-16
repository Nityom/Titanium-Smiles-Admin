'use client';

import React, { useState, useEffect, useRef } from 'react';

const SECTIONS = [
  { key: 'chief_complaint',  label: 'Chief Complaint' },
  { key: 'medical_history',  label: 'Medical History' },
  { key: 'investigation',    label: 'Investigation' },
  { key: 'oral_exam',        label: 'Oral Examination' },
  { key: 'diagnosis',        label: 'Diagnosis' },
  { key: 'treatment_plan',   label: 'Treatment Plan' },
  { key: 'treatment_done',   label: 'Treatment Done' },
  { key: 'advice',           label: 'Advice / Instructions' },
  { key: 'medications',      label: 'Medications' },
];

type SectionMap = Record<string, boolean>;

interface PrintPreviewModalProps {
  prescriptionId: string;
  onClose: () => void;
}

export default function PrintPreviewModal({ prescriptionId, onClose }: PrintPreviewModalProps) {
  const [selected, setSelected] = useState<SectionMap>(
    Object.fromEntries(SECTIONS.map(s => [s.key, true]))
  );
  const [iframeKey, setIframeKey] = useState(0);
  const applyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeSections = Object.entries(selected)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(',');

  // Debounce iframe refresh so it doesn't reload on every keystroke
  const scheduleRefresh = () => {
    if (applyTimer.current) clearTimeout(applyTimer.current);
    applyTimer.current = setTimeout(() => setIframeKey(k => k + 1), 600);
  };

  const toggleSection = (key: string) => {
    setSelected(prev => {
      const next = { ...prev, [key]: !prev[key] };
      return next;
    });
    scheduleRefresh();
  };

  useEffect(() => () => {
    if (applyTimer.current) clearTimeout(applyTimer.current);
  }, []);

  const previewUrl = `/print-prescription?prescriptionId=${prescriptionId}&sections=${activeSections}&noAutoprint=1`;

  const handlePrint = () => {
    const url = `/print-prescription?prescriptionId=${prescriptionId}&sections=${activeSections}`;
    window.open(url, '_blank');
  };

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '900px', maxWidth: '98vw', maxHeight: '90vh' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Print Preview</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left – iframe preview */}
          <div className="flex-1 bg-gray-600 overflow-auto flex flex-col items-center py-4 px-4 gap-3">
            <iframe
              key={iframeKey}
              src={previewUrl}
              title="Prescription Preview"
              className="bg-white shadow-lg rounded"
              style={{
                width: '595px',   /* A4-ish width at ~96dpi */
                maxWidth: '100%',
                height: '700px',
                border: 'none',
                flex: '0 0 auto',
              }}
            />
          </div>

          {/* Right – options panel */}
          <div
            className="flex flex-col border-l border-gray-200 bg-gray-50"
            style={{ width: '220px', flexShrink: 0 }}
          >
            <div className="flex-1 overflow-y-auto p-5">
              <p className="text-sm font-semibold text-gray-700 mb-4">
                Select the items you want to print
              </p>
              <div className="space-y-3">
                {SECTIONS.map(section => (
                  <label
                    key={section.key}
                    className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 select-none"
                  >
                    <input
                      type="checkbox"
                      checked={selected[section.key]}
                      onChange={() => toggleSection(section.key)}
                      className="w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
                    />
                    {section.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 text-xs text-gray-500 leading-relaxed">
              * Only selected sections will appear in the printed prescription.
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: '#2563eb' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#2563eb')}
          >
            Print
          </button>
        </div>
      </div>
    </div>
  );
}

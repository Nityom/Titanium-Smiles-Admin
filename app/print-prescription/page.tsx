'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getPrescriptionById } from '@/services/prescription';

interface ToothData {
  id: number;
  type: string;
  category: string;
  disease: string;
}

interface MedicineEntry {
  name: string;
  dosage: string;
  duration: string;
  quantity?: number;
}

interface TreatmentItem {
  id: number;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface PrescriptionData {
  id: string;
  patient_name: string;
  phone_number: string;
  age?: string;
  sex: string;
  reference_number?: string;
  prescription_date: string;
  chief_complaint?: string;
  medical_history?: string;
  investigation?: string;
  diagnosis?: string;
  treatment_plan?: string[];
  oral_exam_notes?: string;
  selected_teeth?: ToothData[];
  medicines?: MedicineEntry[];
  treatment_done?: TreatmentItem[];
  advice?: string;
  followup_date?: string;
}

function parseArrayField<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function PrintPrescriptionContent() {
  const searchParams = useSearchParams();
  const prescriptionId = searchParams.get('prescriptionId');
  const noAutoprint = searchParams.get('noAutoprint') === '1';
  const sectionsParam = searchParams.get('sections');
  // If no sections param provided, show all; otherwise only show selected keys
  const activeSections: Set<string> | null = sectionsParam
    ? new Set(sectionsParam.split(','))
    : null;
  const show = (key: string) => activeSections === null || activeSections.has(key);

  const [prescriptionData, setPrescriptionData] = useState<PrescriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrescriptionData = async () => {
      if (!prescriptionId) {
        setError('No prescription ID provided');
        setLoading(false);
        return;
      }

      try {
        const data = await getPrescriptionById(prescriptionId);
        if (!data) {
          setPrescriptionData(null);
          return;
        }

        const treatmentPlan = parseArrayField<string>(
          data.treatment_plan ?? data.treatmentPlan
        ).filter((step): step is string => typeof step === 'string' && step.trim().length > 0);

        const treatmentDone = parseArrayField<TreatmentItem>(
          data.treatment_done ?? data.treatmentDone
        );

        setPrescriptionData({
          ...data,
          treatment_plan: treatmentPlan,
          treatment_done: treatmentDone,
        } as PrescriptionData);
      } catch (err) {
        console.error('Error fetching prescription:', err);
        setError(err instanceof Error ? err.message : 'Failed to load prescription data');
      } finally {
        setLoading(false);
      }
    };

    fetchPrescriptionData();
  }, [prescriptionId]);

  // Auto-print when data is loaded (skip when embedded in print preview iframe)
  useEffect(() => {
    if (!loading && prescriptionData && !noAutoprint) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [loading, prescriptionData, noAutoprint]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-900">Loading prescription...</p>
        </div>
      </div>
    );
  }

  if (error || !prescriptionData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-700">{error || 'Prescription not found'}</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB');
  };

  return (
    <>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .rx-container, .rx-container * { visibility: visible; }
          .rx-container {
            position: absolute;
            left: 0; top: 0;
            width: 100%;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          .no-print { display: none !important; }
        }

        @page {
          size: A4;
          margin: 15mm;
        }

        .rx-preview {
          background: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          margin: 20px auto;
          max-width: 210mm;
          padding: 20mm;
        }

        .rx-container {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 13px;
          color: #111;
        }

        .rx-sec-heading {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          margin: 10px 0 3px 0;
          color: #374151;
        }

        .rx-sec-body {
          font-size: 12px;
          line-height: 1.5;
          margin: 0 0 2px 12px;
          white-space: pre-wrap;
          color: #111;
        }

        .rx-med-table {
          border-collapse: collapse;
          width: 100%;
          font-size: 12px;
          margin: 4px 0 6px 0;
        }
        .rx-med-table th {
          font-weight: 700;
          border-top: 2px solid #1f2937;
          border-bottom: 2px solid #1f2937;
          padding: 5px 8px;
          text-align: left;
        }
        .rx-med-table td {
          border-bottom: 1px solid #d1d5db;
          padding: 5px 8px;
          vertical-align: top;
        }
      `}</style>

      <div className="rx-container rx-preview">

        {/* ── HEADER (matching Bill UI) ── */}
        <div className="pb-4 mb-4">
          <div className="flex justify-between items-start">
            <div className="text-left">
              <div className="text-xs text-gray-600 mb-2">PRESCRIPTION</div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <div className="flex items-center justify-center mb-3">
              <img
                src="/dental_logo.svg"
                alt="Titanium Smiles Logo"
                className="h-16 w-16 mr-3"
              />
              <h1 className="text-4xl font-bold text-gray-600">
                Titanium Smiles
              </h1>
            </div>
            <p className="text-xs text-gray-700">
              E3/119, First Floor, Arera Colony, Main Road No. 3,
              Near Gastrocare Hospital, Bhopal, Madhya Pradesh - 462016
            </p>
            <p className="text-xs text-gray-700 mt-1">Mobile: 7771970889</p>
          </div>
          <div className="mt-4 border-t border-gray-200"></div>
        </div>

        {/* ── Prescription No. & Date ── */}
        <div className="pb-3 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm font-semibold">Prescription Date: </span>
              <span className="text-sm">{formatDate(prescriptionData.prescription_date)}</span>
            </div>
            {prescriptionData.reference_number && (
              <div>
                <span className="text-sm font-semibold">Patient Ref.: </span>
                <span className="text-sm">{prescriptionData.reference_number}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Patient Info (matching BILL TO style) ── */}
        <div className="mb-4">
          <div className="text-sm font-semibold mb-1">PATIENT DETAILS</div>
          <div className="text-sm">
            <div className="font-semibold">{prescriptionData.patient_name}</div>
            <div className="text-gray-600">Mobile: {prescriptionData.phone_number}</div>
            {(prescriptionData.age || prescriptionData.sex) && (
              <div className="text-gray-600">
                {prescriptionData.age && `Age: ${prescriptionData.age}`}
                {prescriptionData.age && prescriptionData.sex && ' | '}
                {prescriptionData.sex && `Gender: ${prescriptionData.sex}`}
              </div>
            )}
            {prescriptionData.followup_date && (
              <div className="text-gray-600">Follow-up Date: {formatDate(prescriptionData.followup_date)}</div>
            )}
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="border-t-2 border-gray-800 mb-4"></div>

        {/* ── CHIEF COMPLAINT ── */}
        {show('chief_complaint') && prescriptionData.chief_complaint && (
          <>
            <p className="rx-sec-heading">Chief Complaint</p>
            <p className="rx-sec-body">{prescriptionData.chief_complaint}</p>
          </>
        )}

        {/* ── MEDICAL HISTORY ── */}
        {show('medical_history') && prescriptionData.medical_history && (
          <>
            <p className="rx-sec-heading">Medical History</p>
            <p className="rx-sec-body">{prescriptionData.medical_history}</p>
          </>
        )}

        {/* ── INVESTIGATION ── */}
        {show('investigation') && prescriptionData.investigation && (
          <>
            <p className="rx-sec-heading">Investigation</p>
            <p className="rx-sec-body">{prescriptionData.investigation}</p>
          </>
        )}

        {/* ── ORAL EXAMINATION ── */}
        {show('oral_exam') && (prescriptionData.oral_exam_notes || (prescriptionData.selected_teeth && prescriptionData.selected_teeth.length > 0)) && (
          <>
            <p className="rx-sec-heading">Oral Examination</p>
            {prescriptionData.selected_teeth && prescriptionData.selected_teeth.length > 0 && (
              <div className="rx-sec-body">
                {prescriptionData.selected_teeth.map((tooth, index) => (
                  <div key={index}>Tooth #{tooth.id} ({tooth.type}) &ndash; {tooth.disease}</div>
                ))}
              </div>
            )}
            {prescriptionData.oral_exam_notes && (
              <p className="rx-sec-body">{prescriptionData.oral_exam_notes}</p>
            )}
          </>
        )}

        {/* ── DIAGNOSIS ── */}
        {show('diagnosis') && prescriptionData.diagnosis && (
          <>
            <p className="rx-sec-heading">Diagnosis</p>
            <p className="rx-sec-body">{prescriptionData.diagnosis}</p>
          </>
        )}

        {/* ── TREATMENT PLAN ── */}
        {show('treatment_plan') && prescriptionData.treatment_plan && prescriptionData.treatment_plan.length > 0 && (
          <>
            <p className="rx-sec-heading">Treatment Plan</p>
            <div className="rx-sec-body">
              {prescriptionData.treatment_plan.map((step, index) => (
                <div key={index}>{index + 1}. {step}</div>
              ))}
            </div>
          </>
        )}

        {/* ── TREATMENT DONE ── */}
        {show('treatment_done') && prescriptionData.treatment_done && prescriptionData.treatment_done.length > 0 && (
          <>
            <p className="rx-sec-heading">Treatment Done</p>
            <div className="rx-sec-body">
              {prescriptionData.treatment_done.map((item, index) => (
                <div key={index}>{index + 1}. {item.description}</div>
              ))}
            </div>
          </>
        )}

        {/* ── MEDICATIONS (matching bill items table style) ── */}
        {show('medications') && prescriptionData.medicines && prescriptionData.medicines.length > 0 && (
          <div className="mb-6 mt-2">
            <p className="rx-sec-heading" style={{ marginBottom: '6px' }}>Medications</p>
            <table className="rx-med-table">
              <thead>
                <tr>
                  <th style={{ width: '6%', textAlign: 'center' }}>#</th>
                  <th style={{ width: '44%' }}>Medication</th>
                  <th style={{ width: '25%' }}>Dosage</th>
                  <th style={{ width: '25%' }}>Duration</th>
                </tr>
              </thead>
              <tbody>
                {prescriptionData.medicines.map((medicine, index) => (
                  <tr key={index}>
                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                    <td>{medicine.name}</td>
                    <td>{medicine.dosage || '—'}</td>
                    <td>{medicine.duration || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── ADVICE ── */}
        {show('advice') && prescriptionData.advice && (
          <>
            <p className="rx-sec-heading">Advice / Instructions</p>
            <p className="rx-sec-body">{prescriptionData.advice}</p>
          </>
        )}

        {/* ── Signature (matching bill signature) ── */}
        <div className="mt-12 pt-8">
          <div className="flex justify-end">
            <div className="text-center">
              <div className="mb-4 h-20 flex items-center justify-center">
                <Image
                  src="/sign.png"
                  alt="Doctor's Signature"
                  width={120}
                  height={80}
                  style={{ objectFit: 'contain' }}
                />
              </div>
              <div className="border-t border-gray-800 pt-2 text-sm font-semibold">
                <div>DOCTOR&apos;S SIGNATURE</div>
                <div className="text-gray-500">Titanium Smiles</div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Print / Close buttons (screen only) */}
      <div className="no-print flex justify-center gap-3 mt-6 mb-4">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition-colors"
        >
          Print Prescription
        </button>
        <button
          onClick={() => window.close()}
          className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition-colors"
        >
          Close
        </button>
      </div>
    </>
  );
}

export default function PrintPrescriptionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-900">Loading...</p>
        </div>
      </div>
    }>
      <PrintPrescriptionContent />
    </Suspense>
  );
}

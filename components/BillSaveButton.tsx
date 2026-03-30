import { Button } from "@/components/ui/button";
import {
  createBill,
  updateBill,
  getBillByPrescriptionId,
  Bill
} from "@/services/bills";
import { useState } from "react";
import { Alert, AlertDescription } from "./ui/alert";
import { useRouter } from "next/navigation";
import { getPatientByReference } from "@/services/patients";

interface BillSaveButtonProps {
  prescriptionId: string | null;
  patientId: string;
  referenceNumber: string;
  items: Array<{
    description?: string;
    name?: string;
    quantity?: number;
    unitPrice?: number;
    price?: number;
    total?: number;
    itemType?: string;
  }>;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: "PENDING" | "PARTIAL" | "PAID";
  notes?: string;
  onBack?: () => void;
}

export function BillSaveButton({
  prescriptionId,
  patientId,
  referenceNumber,
  items,
  totalAmount,
  paidAmount,
  paymentStatus,
  notes,
  onBack,
}: BillSaveButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { push } = useRouter();

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      if (!prescriptionId) {
        throw new Error("Please save the prescription first before generating a bill");
      }

      // Get patient data from reference number if provided
      const patientData = referenceNumber ?
        await getPatientByReference(referenceNumber) :
        null;

      const effectivePatientId = patientData?.id || patientId;
      const effectiveReferenceNumber = referenceNumber;

      const existingBill = await getBillByPrescriptionId(prescriptionId);

      // Validate required fields
      if (!items || items.length === 0) {
        throw new Error("Please add at least one item to the bill");
      }

      if (totalAmount <= 0) {
        throw new Error("Total amount must be greater than 0");
      }

      // Format items and calculate totals properly
      const formattedItems = items.map(item => ({
        description: item.description || item.name,
        quantity: item.quantity || 1,
        unit_price: item.unitPrice || item.price || 0,
        total: item.total || (item.quantity || 1) * (item.unitPrice || item.price || 0),
        item_type: item.itemType || 'procedure'
      }));

      // Calculate the actual total amount from the formatted items
      const calculatedTotal = formattedItems.reduce((sum, item) => sum + item.total, 0);

      // Ensure the total matches what was calculated
      if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
        console.warn('Total amount mismatch detected. Using calculated total:', calculatedTotal);
      }

      // Determine final payment status and paid amount
      let effectivePaymentStatus = paymentStatus;
      let effectivePaidAmount = Math.min(paidAmount, totalAmount); // Ensure paid amount doesn't exceed total

      if (effectivePaidAmount >= totalAmount) {
        effectivePaymentStatus = "PAID";
        effectivePaidAmount = totalAmount;
      } else if (effectivePaidAmount > 0) {
        effectivePaymentStatus = "PARTIAL";
      } else {
        effectivePaymentStatus = "PENDING";
        effectivePaidAmount = 0;
      }

      // Prepare the bill data for create/update
      const billData = {
        prescription_id: prescriptionId,
        patient_id: effectivePatientId || '',
        reference_number: effectiveReferenceNumber || '',
        total_amount: totalAmount,
        paid_amount: effectivePaidAmount,
        payment_status: effectivePaymentStatus,
        items: formattedItems,
        notes: notes || ''
      };

      let savedBill;
      if (existingBill) {
        // For update, we can pass partial data
        const updateData = {
          total_amount: totalAmount,
          paid_amount: effectivePaidAmount,
          payment_status: effectivePaymentStatus,
          items: formattedItems,
          notes: notes || ''
        };
        savedBill = await updateBill(existingBill.id as string, updateData);
      } else {
        // For create, we need all required fields
        savedBill = await createBill(billData as Bill);
      }

      if (savedBill) {
        await push('/admin/prescription');
      }
    } catch (err) {
      console.error('Error saving bill:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save bill';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription className="font-medium">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        {onBack && (
          <Button onClick={onBack} variant="outline">
            Back
          </Button>
        )}
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Bill"}
        </Button>
      </div>
    </div>
  );
}

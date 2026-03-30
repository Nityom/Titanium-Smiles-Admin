"use client";

import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { formatDate } from "@/lib/utils";
import PaymentHistory from "./PaymentHistory";
import AddPaymentDialog from "./AddPaymentDialog";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Bill } from "@/services/bills";

interface BillHistoryWithPaymentsProps {
  bills: Bill[];
  onBillUpdated?: () => void;
}

export function BillHistoryWithPayments({ bills, onBillUpdated }: BillHistoryWithPaymentsProps) {
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  if (!bills || bills.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm text-gray-500">No bills found</p>
      </Card>
    );
  }

  const toggleBillExpansion = (billId: string) => {
    setExpandedBillId(expandedBillId === billId ? null : billId);
  };

  const handleAddPaymentClick = (bill: Bill) => {
    setSelectedBill(bill);
    setShowAddPayment(true);
  };

  const handlePaymentAdded = () => {
    if (onBillUpdated) {
      onBillUpdated();
    }
    setShowAddPayment(false);
  };

  return (
    <>
      <div className="space-y-4">
        {bills.map((bill) => {
          if (!bill.id) return null; // Skip bills without IDs
          
          const isExpanded = expandedBillId === bill.id;
          const hasBalance = (Number(bill.balance_amount) || 0) > 0;

          return (
            <div key={bill.id} className="space-y-2">
              <Card className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">
                        {bill.bill_number || `Bill #${bill.id.slice(0, 8)}`}
                      </p>
                      {bill.payment_status && (
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                          bill.payment_status === 'PAID' 
                            ? 'bg-green-100 text-green-700' 
                            : bill.payment_status === 'PARTIAL' 
                            ? 'bg-yellow-100 text-yellow-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {bill.payment_status}
                        </span>
                      )}
                    </div>
                    {bill.patient_name && (
                      <p className="text-sm font-medium text-gray-700">
                        {bill.patient_name}
                      </p>
                    )}
                    {bill.phone_number && (
                      <p className="text-sm text-gray-500">
                        📱 {bill.phone_number}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Created on {bill.created_at ? formatDate(bill.created_at) : 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">₹{bill.total_amount.toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Paid</p>
                    <p className="font-medium text-green-600">₹{bill.paid_amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Balance</p>
                    <p className="font-medium text-orange-600">₹{(Number(bill.balance_amount) || 0).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    {hasBalance && (
                      <Button
                        size="sm"
                        onClick={() => handleAddPaymentClick(bill)}
                        className="mt-1"
                      >
                        Add Payment
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expand/Collapse Button */}
                <div className="mt-3 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => bill.id && toggleBillExpansion(bill.id)}
                    className="w-full"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="mr-2 h-4 w-4" />
                        Hide Payment History
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-2 h-4 w-4" />
                        View Payment History
                      </>
                    )}
                  </Button>
                </div>
              </Card>

              {/* Payment History Section (Expanded) */}
              {isExpanded && bill.id && (
                <div className="ml-4">
                  <PaymentHistory
                    billId={bill.id}
                    totalAmount={bill.total_amount}
                    paidAmount={bill.paid_amount}
                    balanceAmount={Number(bill.balance_amount) || 0}
                    onPaymentAdded={onBillUpdated || (() => {})}
                    onAddPaymentClick={() => handleAddPaymentClick(bill)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Payment Dialog */}
      {selectedBill && selectedBill.id && selectedBill.patient_id && (
        <AddPaymentDialog
          open={showAddPayment}
          onOpenChange={setShowAddPayment}
          billId={selectedBill.id}
          patientId={selectedBill.patient_id}
          balanceAmount={Number(selectedBill.balance_amount) || 0}
          onPaymentAdded={handlePaymentAdded}
        />
      )}
    </>
  );
}

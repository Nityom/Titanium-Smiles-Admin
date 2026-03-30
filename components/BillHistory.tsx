import { Card } from "./ui/card";
import { formatDate } from "@/lib/utils";

interface BillHistoryProps {
  bills: Array<{
    id: string;
    total_amount: number;
    paid_amount: number;
    balance_amount: number;
    payment_status: 'PENDING' | 'PARTIAL' | 'PAID';
    created_at: string;
  }>;
}

export function BillHistory({ bills }: BillHistoryProps) {
  if (!bills || bills.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm text-gray-500">No bills found</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {bills.map((bill) => (
        <Card key={bill.id} className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium">Bill #{bill.id.slice(0, 8)}</p>
              <p className="text-sm text-gray-500">
                Created on {formatDate(bill.created_at)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium">₹{bill.total_amount}</p>
              <p className={`text-sm ${
                bill.payment_status === 'PAID' 
                  ? 'text-green-600' 
                  : bill.payment_status === 'PARTIAL' 
                  ? 'text-yellow-600' 
                  : 'text-red-600'
              }`}>
                {bill.payment_status}
              </p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-gray-500">Paid Amount</p>
              <p>₹{bill.paid_amount}</p>
            </div>
            <div>
              <p className="text-gray-500">Balance</p>
              <p>₹{bill.balance_amount}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

import { Bill } from './patient';
import { Prescription } from '@/services/prescription';

export interface PrescriptionWithBill extends Prescription {
  bills?: Bill[];
}

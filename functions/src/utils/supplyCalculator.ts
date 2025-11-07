import { normalizeDate, dateDiffInDays, addDays } from './dateUtils';

const REORDER_BUFFER_DAYS = 10;

export interface PrescriptionData {
  id: string;
  name: string;
  packSize: number;
  dailyDose: number;
  startDate: FirebaseFirestore.Timestamp;
  startSupply: number;
  supplyLog: Array<{
    date: FirebaseFirestore.Timestamp;
    quantity: number;
  }>;
}

export interface SupplyInfo {
  currentSupply: number;
  runOutDate: Date;
  reorderDate: Date;
  daysRemaining: number;
}

/**
 * Calculates supply information for a prescription.
 */
export function calculateSupplyInfo(prescription: PrescriptionData): SupplyInfo {
  try {
    const today = normalizeDate(new Date());
    const startDate = normalizeDate(prescription.startDate.toDate());
    const dailyDose = prescription.dailyDose;

    // 1. Calculate total supply added
    let totalAdded = prescription.startSupply;
    prescription.supplyLog.forEach((log) => {
      totalAdded += log.quantity;
    });

    // 2. Calculate total consumed based on days passed
    const daysPassed = dateDiffInDays(today, startDate);
    const totalConsumed = daysPassed < 0 ? 0 : daysPassed * dailyDose;

    // 3. Calculate current supply
    const currentSupply = totalAdded - totalConsumed;

    // 4. Calculate future dates
    const daysRemaining = dailyDose > 0 ? Math.floor(currentSupply / dailyDose) : 9999;
    const runOutDate = addDays(today, daysRemaining);
    const reorderDate = addDays(runOutDate, -REORDER_BUFFER_DAYS);

    return {
      currentSupply: Math.max(0, currentSupply),
      runOutDate,
      reorderDate,
      daysRemaining: Math.max(0, daysRemaining),
    };
  } catch (error) {
    console.error('Error calculating supply info:', error, prescription);
    return {
      currentSupply: 0,
      runOutDate: new Date(),
      reorderDate: new Date(),
      daysRemaining: 0,
    };
  }
}


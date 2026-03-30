/**
 * Consumable Items Configuration
 * 
 * This file defines the consumable items that are automatically deducted from inventory
 * when a new prescription is created for a patient.
 * 
 * HOW TO MODIFY:
 * 1. To change quantities: Update the 'quantity' value for any item
 * 2. To add new items: Add a new object with 'name' and 'quantity' properties
 * 3. To remove items: Delete or comment out the item
 * 4. Item names must match exactly with inventory item names (case-insensitive)
 * 
 * NOTE: Changes take effect immediately after saving this file.
 */

export interface ConsumableItem {
  name: string;
  quantity: number;
  description?: string; // Optional description for reference
}

export const CONSUMABLE_ITEMS_PER_PATIENT: ConsumableItem[] = [
  {
    name: 'Prescription paper',
    quantity: 1,
    description: 'One prescription paper per patient visit'
  },
  {
    name: 'File',
    quantity: 1,
    description: 'Patient file for record keeping'
  },
  {
    name: 'Head cap',
    quantity: 1,
    description: 'Disposable head cap for hygiene'
  },
  {
    name: 'Plastic gloves',
    quantity: 2,
    description: 'One pair of gloves (2 pieces)'
  },
  {
    name: 'Shoe cover',
    quantity: 2,
    description: 'One pair of shoe covers (2 pieces)'
  }
];

/**
 * Get all consumable items
 * @returns Array of consumable items to deduct per patient
 */
export const getConsumableItems = (): ConsumableItem[] => {
  return CONSUMABLE_ITEMS_PER_PATIENT;
};

/**
 * Get consumable items formatted for inventory deduction
 * @returns Array formatted for deductInventoryStock function
 */
export const getConsumableItemsForDeduction = (): Array<{name: string, quantity: number}> => {
  return CONSUMABLE_ITEMS_PER_PATIENT.map(item => ({
    name: item.name,
    quantity: item.quantity
  }));
};

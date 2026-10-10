/** Bedrijfsregels. Moeten gelijk blijven aan de databasefuncties (stap 2 test dat). */
export const RULES = {
  minRentalDays: 3,
  optionHours: 48,
  reminderHoursBeforeExpiry: 24,
  responseHours: 24,
  availabilityMonthsAhead: 12,
} as const;

/** Curaçao: UTC−4, geen zomertijd. */
export const CURACAO_UTC_OFFSET_HOURS = -4;

/** PLACEHOLDERS — vervangen zodra Happy Ride de gegevens aanlevert. */
export const CONTACT = {
  whatsapp: '59990000000', // alleen cijfers, met landcode 599
  email: 'info@happyride.cw',
  address: '[Adres], Willemstad, Curaçao',
} as const;

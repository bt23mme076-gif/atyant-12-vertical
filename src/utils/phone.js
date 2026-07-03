// Shared phone-matching helper.
//
// Phone numbers in this app show up in at least 4 shapes depending on where
// they were entered (raw as typed, bare 10-digit, 91-prefixed, +91-prefixed).
// This used to be copy-pasted (and drifting slightly) across
// paymentController.js's verifyPayment and getMyBookings. Centralizing it
// here so the Cashfree webhook handler, verifyPayment, and getMyBookings all
// match phone numbers the exact same way.
//
// Returns an array of Mongo query clauses suitable for spreading into an
// existing `$or` array, e.g.:
//   query.$or.push(...normalizePhoneVariants(user.phone));
export function normalizePhoneVariants(phone) {
  if (!phone) return [];

  const rawPhone = String(phone).replace(/[^\d]/g, '');
  const tenDigit = rawPhone.slice(-10);

  if (!tenDigit) return [];

  return [
    { phone: tenDigit },
    { phone: `91${tenDigit}` },
    { phone: `+91${tenDigit}` },
    { phone },
  ];
}

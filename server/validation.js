// ----------------------------------------------------------------------------
// Backend validation. The frontend validates too, but users can send
// invalid data straight to the API. nothing reaches the database or the
// calculator without passing here first. Invalid input returns a 
// 400 with a list of messages
// ----------------------------------------------------------------------------

const COVER_TYPES = ['Single', 'Couple', 'Family'];
const HISTORY_OPTIONS = ['Yes', 'No', 'Not sure'];
const HOSPITAL_LEVELS = ['None', 'Basic', 'Bronze', 'Silver', 'Gold'];
const EXTRAS_LEVELS = ['None', 'Basic', 'Standard', 'Premium'];
const PAYMENT_FREQUENCIES = ['Monthly', 'Yearly'];

const MIN_AGE = 18;
const MAX_AGE = 100;
const MIN_DISCOUNT = 0;
const MAX_DISCOUNT = 10;

// Foorms often send numbers as strings
function toInt(value) {
  const n = Number(value);
  return Number.isInteger(n) ? n : NaN;
}

function isBlank(value) {
  return value === undefined || value === null || value === '';
}

/**
 * Validate a quote payload.
 * @returns {{ valid: true, quote: object } | { valid: false, errors: string[] }}
 */
function validateQuote(body = {}) {
  const errors = [];

  // Customer name (required)
  const name = typeof body.customer_name === 'string' ? body.customer_name.trim() : '';
  if (!name) errors.push('Customer name is required.');

  // Cover selections (required, must be known values)
  const coverType = body.cover_type;
  if (!COVER_TYPES.includes(coverType)) {
    errors.push('Cover type must be Single, Couple or Family.');
  }
  const hospital = body.hospital_cover;
  if (!HOSPITAL_LEVELS.includes(hospital)) {
    errors.push(`Hospital cover must be one of: ${HOSPITAL_LEVELS.join(', ')}.`);
  }
  const extras = body.extras_cover;
  if (!EXTRAS_LEVELS.includes(extras)) {
    errors.push(`Extras cover must be one of: ${EXTRAS_LEVELS.join(', ')}.`);
  }
  // Design decision: at least one cover is required.
  if (hospital === 'None' && extras === 'None') {
    errors.push('Select at least one cover - hospital and extras cannot both be None.');
  }

  // Applicant 1 (always required)
  const a1age = toInt(body.applicant1_age);
  if (Number.isNaN(a1age) || a1age < MIN_AGE || a1age > MAX_AGE) {
    errors.push(`Applicant 1 age must be a whole number between ${MIN_AGE} and ${MAX_AGE}.`);
  }
  if (!HISTORY_OPTIONS.includes(body.applicant1_cover_history)) {
    errors.push('Applicant 1 cover history must be Yes, No or Not sure.');
  }

  // Applicant 2 (required for Couple / Family)
  const needsApplicant2 = coverType === 'Couple' || coverType === 'Family';
  let a2age = null;
  let a2history = null;
  if (needsApplicant2) {
    if (isBlank(body.applicant2_age)) {
      errors.push('Applicant 2 age is required for Couple or Family cover.');
    } else {
      a2age = toInt(body.applicant2_age);
      if (Number.isNaN(a2age) || a2age < MIN_AGE || a2age > MAX_AGE) {
        errors.push(`Applicant 2 age must be a whole number between ${MIN_AGE} and ${MAX_AGE}.`);
      }
    }
    if (!HISTORY_OPTIONS.includes(body.applicant2_cover_history)) {
      errors.push('Applicant 2 cover history is required (Yes, No or Not sure) for Couple or Family cover.');
    } else {
      a2history = body.applicant2_cover_history;
    }
  }

  // Payment frequency + annual discount
  if (!PAYMENT_FREQUENCIES.includes(body.payment_frequency)) {
    errors.push('Payment frequency must be Monthly or Yearly.');
  }
  let discount = 0;
  if (!isBlank(body.annual_discount)) {
    discount = Number(body.annual_discount);
    if (Number.isNaN(discount) || discount < MIN_DISCOUNT || discount > MAX_DISCOUNT) {
      errors.push(`Annual discount must be between ${MIN_DISCOUNT}% and ${MAX_DISCOUNT}%.`);
      discount = 0;
    }
  }

  if (errors.length > 0) return { valid: false, errors };

  // Applicant 2 fields are forced to NULL for Single cover
  return {
    valid: true,
    quote: {
      customer_name: name,
      cover_type: coverType,
      applicant1_age: a1age,
      applicant1_cover_history: body.applicant1_cover_history,
      applicant2_age: needsApplicant2 ? a2age : null,
      applicant2_cover_history: needsApplicant2 ? a2history : null,
      hospital_cover: hospital,
      extras_cover: extras,
      payment_frequency: body.payment_frequency,
      annual_discount: discount,
      notes: typeof body.notes === 'string' ? body.notes.trim() : '',
    },
  };
}

module.exports = {
  validateQuote,
  COVER_TYPES,
  HISTORY_OPTIONS,
  HOSPITAL_LEVELS,
  EXTRAS_LEVELS,
  PAYMENT_FREQUENCIES,
};


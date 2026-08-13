// ----------------------------------------------------------------------------
// main math
//
// NOTE: The database stores raw quote inputs only. Every time a quote is displayed,
// this module recalculates the full breakdown. One page pricing rule set.
//
// Formulas:
//   hospital (per adult) = tier price × (1 + that adult's LHC loading)
//   hospital total       = sum over adults (1 for Single, 2 for Couple/Family)
//   extras total         = extras tier price × adult count   (never loaded)
//   family fee           = $30 if Family, else $0
//   monthly premium      = hospital total + extras total + family fee
//   yearly before disc.  = monthly premium × 12
//   yearly after disc.   = yearly before × (1 - discount)    (Yearly only)
// ----------------------------------------------------------------------------

const HOSPITAL_PRICES = { None: 0, Basic: 90, Bronze: 120, Silver: 160, Gold: 220 };
const EXTRAS_PRICES = { None: 0, Basic: 25, Standard: 45, Premium: 70 };
const FAMILY_UPGRADE_FEE = 30; // $/month, Family only - added once, automatically

// requires this exact sentence on every explanation sheet.
const LHC_STATEMENT =
  'Lifetime Health Cover loading applies only to hospital cover. It does not apply to extras cover.';

// Rounding to cents (common e.g. 160 * 1.2 = 192.00000000000003)
const round2 = (n) => Math.round(n * 100) / 100;
const money = (n) => `$${n.toFixed(2)}`;

/**
 * LHC loading for ONE applicant
 *
 * Rules:
 *  - History "Yes"       --> 0%
 *  - History "Not sure"  --> 0% applied, but warning issued as quote may be inaccurate
 *  - History "No"        --> (age - 30) × 2%; only when age > 30.
 *  - Hospital cover None --> 0% regardless
 *
 * @returns {{ percent: number, unknownHistory: boolean }}
 */
function lhcLoading(age, history, hospitalSelected) {
  // Making sure the "Not sure" warning applies only when hospital cover is selected.
  const unknownHistory = history === 'Not sure' && hospitalSelected;

  if (!hospitalSelected) return { percent: 0, unknownHistory };
  if (history === 'No' && age > 30) return { percent: (age - 30) * 2, unknownHistory };
  return { percent: 0, unknownHistory }; // "Yes", "Not sure", or age ≤ 30
}

/**
 * Calculate the full premium breakdown for a validated stored quote record.
 */
function calculateQuote(q) {
  const adults = q.cover_type === 'Single' ? 1 : 2; // Couple and Family = 2 adults
  const hospitalBase = HOSPITAL_PRICES[q.hospital_cover] ?? 0;
  const extrasBase = EXTRAS_PRICES[q.extras_cover] ?? 0;
  const hospitalSelected = hospitalBase > 0;

  // Hospital, per applicant, with LHC loading (hospital ONLY, never extras)
  const applicants = [];
  const warnings = [];

  const people = [{ n: 1, age: q.applicant1_age, history: q.applicant1_cover_history }];
  if (adults === 2 && q.applicant2_age != null && q.applicant2_cover_history != null) {
    // Null check before access - applicant2 fields are NULL for Single
    people.push({ n: 2, age: q.applicant2_age, history: q.applicant2_cover_history });
  }

  for (const p of people) {
    const { percent, unknownHistory } = lhcLoading(p.age, p.history, hospitalSelected);
    const hospitalPremium = round2(hospitalBase * (1 + percent / 100));
    applicants.push({
      applicant: p.n,
      age: p.age,
      history: p.history,
      lhcLoadingPercent: percent,
      hospitalPremium,
    });
    if (unknownHistory) {
      // Exact wording pattern required.
      warnings.push(
        `Applicant ${p.n}: Cover history is unknown - LHC loading has not been applied. This quote may be inaccurate.`
      );
    }
  }

  const hospitalTotal = round2(applicants.reduce((sum, a) => sum + a.hospitalPremium, 0));

  // Extras: flat per-adult price × adult count. LHC no.
  const extrasTotal = round2(extrasBase * adults);

  // Family upgrade fee: flat $30/month, added once, automatically.
  const familyFee = q.cover_type === 'Family' ? FAMILY_UPGRADE_FEE : 0;

  // Totals
  const monthlyPremium = round2(hospitalTotal + extrasTotal + familyFee);
  const yearlyBeforeDiscount = round2(monthlyPremium * 12);

  const isYearly = q.payment_frequency === 'Yearly';
  const discountPercent = isYearly ? Number(q.annual_discount) || 0 : 0; // Monthly payers get NO discount
  const yearlyAfterDiscount = isYearly
    ? round2(yearlyBeforeDiscount * (1 - discountPercent / 100))
    : null;

  return {
    adults,
    hospital: { level: q.hospital_cover, basePerAdult: hospitalBase, total: hospitalTotal },
    extras: { level: q.extras_cover, basePerAdult: extrasBase, total: extrasTotal },
    familyFee,
    monthlyPremium,
    yearlyBeforeDiscount,
    paymentFrequency: q.payment_frequency,
    discountPercent,
    yearlyAfterDiscount, // null when paying monthly
    applicants,
    warnings,
    lhcStatement: LHC_STATEMENT,
    explanation: buildExplanation({
      q, adults, hospitalBase, extrasBase, applicants,
      hospitalTotal, extrasTotal, familyFee,
      monthlyPremium, yearlyBeforeDiscount, isYearly, discountPercent, yearlyAfterDiscount,
    }),
  };
}

/**
 * Plain English
 * Returned as an array
 */
function buildExplanation(c) {
  const s = [];
  const { q } = c;

  if (c.hospitalBase > 0) {
    s.push(`Hospital cover (${q.hospital_cover}) costs ${money(c.hospitalBase)} per adult per month.`);
    for (const a of c.applicants) {
      if (a.lhcLoadingPercent > 0) {
        s.push(
          `Applicant ${a.applicant} (age ${a.age}, no previous hospital cover) receives a ` +
          `${a.lhcLoadingPercent}% Lifetime Health Cover loading: ${money(c.hospitalBase)} × ` +
          `${(1 + a.lhcLoadingPercent / 100).toFixed(2)} = ${money(a.hospitalPremium)}.`
        );
      } else {
        s.push(
          `Applicant ${a.applicant} (age ${a.age}) has no LHC loading, so their hospital premium is ` +
          `${money(a.hospitalPremium)}.`
        );
      }
    }
    s.push(`Hospital total: ${money(c.hospitalTotal)}.`);
  } else {
    s.push('No hospital cover was selected, so the hospital premium is $0.00 and no LHC loading can apply.');
  }

  if (c.extrasBase > 0) {
    s.push(
      `Extras cover (${q.extras_cover}) costs ${money(c.extrasBase)} per adult: ${money(c.extrasBase)} × ` +
      `${c.adults} adult${c.adults > 1 ? 's' : ''} = ${money(c.extrasTotal)}. ` +
      'LHC loading is never applied to extras.'
    );
  } else {
    s.push('No extras cover was selected, so the extras premium is $0.00.');
  }

  if (c.familyFee > 0) {
    s.push(`Family cover adds a flat ${money(c.familyFee)} monthly upgrade fee, which covers dependent children under the one policy.`);
  }

  s.push(
    `Monthly premium = hospital ${money(c.hospitalTotal)} + extras ${money(c.extrasTotal)}` +
    (c.familyFee ? ` + family fee ${money(c.familyFee)}` : '') +
    ` = ${money(c.monthlyPremium)}.`
  );
  s.push(`Yearly premium before discount = ${money(c.monthlyPremium)} × 12 = ${money(c.yearlyBeforeDiscount)}.`);

  if (c.isYearly) {
    s.push(
      `Paying yearly with a ${c.discountPercent}% annual-payment discount: ${money(c.yearlyBeforeDiscount)} × ` +
      `${(1 - c.discountPercent / 100).toFixed(2)} = ${money(c.yearlyAfterDiscount)}.`
    );
  } else {
    s.push('Paying monthly, so the annual-payment discount is not applied.');
  }

  return s;
}

module.exports = {
  calculateQuote,
  HOSPITAL_PRICES,
  EXTRAS_PRICES,
  FAMILY_UPGRADE_FEE,
  LHC_STATEMENT,
};
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getQuote, deleteQuote, formatCreatedAt } from '../api.js';

const fmt = (n) =>
  '$' + Number(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * The Explanation Sheet: a plain-English breakdown showing the
 * hospital and extras premiums as separate line items, each applicant's LHC
 * loading %, the family fee, both monthly and yearly estimates, any warnings,
 * the required LHC statement, and how the quote was calculated.
 */
function ExplanationSheet({ breakdown }) {
  const b = breakdown;
  const isYearly = b.paymentFrequency === 'Yearly';

  return (
    <>
      {/* Warnings first, so they can't be missed. */}
      {b.warnings.length > 0 && (
        <div className="warnings" role="alert">
          {b.warnings.map((w) => <p key={w}>⚠ {w}</p>)}
        </div>
      )}

      {/* Headline estimates: monthly and yearly always shown. */}
      <div className="totals">
        <div className="total-box">
          <span className="total-label">Estimated monthly premium</span>
          <span className="total-value">{fmt(b.monthlyPremium)}</span>
        </div>
        <div className="total-box">
          <span className="total-label">Yearly before discount</span>
          <span className="total-value">{fmt(b.yearlyBeforeDiscount)}</span>
        </div>
        {isYearly && (
          <div className="total-box final">
            <span className="total-label">Yearly after {b.discountPercent}% discount</span>
            <span className="total-value">{fmt(b.yearlyAfterDiscount)}</span>
          </div>
        )}
      </div>

      {/* The one Monthly vs Yearly difference, stated once, clearly. */}
      <p className="payment-note">
        {isYearly
          ? `Paying yearly: the ${b.discountPercent}% annual-payment discount is applied to the yearly total, making ${fmt(b.yearlyAfterDiscount)} the final estimate.`
          : 'Paying monthly: the annual-payment discount is not applied. The yearly figure above is simply the monthly premium × 12.'}
      </p>

      {/* Line-item breakdown: hospital and extras kept separate. */}
      <h2>Premium breakdown</h2>
      <table className="table breakdown">
        <tbody>
          <tr className="section-row">
            <td>Hospital cover - {b.hospital.level}
              {b.hospital.basePerAdult > 0 && (
                <span className="muted"> ({fmt(b.hospital.basePerAdult)} per adult / month)</span>
              )}
            </td>
            <td className="num">{fmt(b.hospital.total)}</td>
          </tr>
          {b.applicants.map((a) => (
            <tr key={a.applicant} className="sub-row">
              <td>
                Applicant {a.applicant} - age {a.age}, LHC loading <strong>{a.lhcLoadingPercent}%</strong>
              </td>
              <td className="num">{fmt(a.hospitalPremium)}</td>
            </tr>
          ))}
          <tr className="section-row">
            <td>Extras cover - {b.extras.level}
              {b.extras.basePerAdult > 0 && (
                <span className="muted"> ({fmt(b.extras.basePerAdult)} × {b.adults} adult{b.adults > 1 ? 's' : ''})</span>
              )}
            </td>
            <td className="num">{fmt(b.extras.total)}</td>
          </tr>
          {b.familyFee > 0 && (
            <tr className="section-row">
              <td>Family upgrade fee <span className="muted">(flat, covers dependent children)</span></td>
              <td className="num">{fmt(b.familyFee)}</td>
            </tr>
          )}
          <tr className="grand-row">
            <td>Monthly premium</td>
            <td className="num">{fmt(b.monthlyPremium)}</td>
          </tr>
          <tr>
            <td>Yearly premium before discount <span className="muted">(monthly × 12)</span></td>
            <td className="num">{fmt(b.yearlyBeforeDiscount)}</td>
          </tr>
          {isYearly && (
            <>
              <tr>
                <td>Annual payment discount</td>
                <td className="num">-{b.discountPercent}%</td>
              </tr>
              <tr className="grand-row final">
                <td>Final yearly estimate</td>
                <td className="num">{fmt(b.yearlyAfterDiscount)}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>

      {/* Required LHC statement, word for word. */}
      <div className="lhc-note">{b.lhcStatement}</div>

      <h2>How this quote was calculated</h2>
      <ol className="explanation">
        {b.explanation.map((line) => <li key={line}>{line}</li>)}
      </ol>
    </>
  );
}

export default function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getQuote(id)
      .then(setData)
      .catch((err) => setError(err.errors.join(' ')));
  }, [id]);

  async function handleDelete() {
    const ok = window.confirm(`Delete the quote for "${data.quote.customer_name}"?`);
    if (!ok) return;
    await deleteQuote(id);
    navigate('/');
  }

  if (error) return <div className="errors" role="alert">{error}</div>;
  if (!data) return <p className="muted">Loading quote…</p>;

  const { quote, breakdown } = data;

  return (
    <div className="page">
      <div className="page-head">
        <h1>{quote.customer_name}</h1>
        <div className="row-actions">
          <Link to={`/quotes/${quote.id}/edit`} className="btn">Edit</Link>
          <button className="btn danger" onClick={handleDelete}>Delete</button>
          <Link to="/" className="btn">Back to list</Link>
        </div>
      </div>

      <p className="muted">
        {quote.cover_type} cover · paying {quote.payment_frequency.toLowerCase()} · created {formatCreatedAt(quote.created_at)}
        {quote.notes ? <> · notes: {quote.notes}</> : null}
      </p>

      <div className="breakdown_form">
        <ExplanationSheet breakdown={breakdown} />
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createQuote, getQuote, updateQuote } from '../api.js';

// Option lists for server/validation.js).
const COVER_TYPES = ['Single', 'Couple', 'Family'];
const HISTORY_OPTIONS = ['Yes', 'No', 'Not sure'];
const HOSPITAL_LEVELS = ['None', 'Basic', 'Bronze', 'Silver', 'Gold'];
const EXTRAS_LEVELS = ['None', 'Basic', 'Standard', 'Premium'];
const PAYMENT_FREQUENCIES = ['Monthly', 'Yearly'];

const EMPTY_FORM = {
  customer_name: '',
  cover_type: 'Single',
  applicant1_age: '',
  applicant1_cover_history: 'Yes',
  applicant2_age: '',
  applicant2_cover_history: 'Yes',
  hospital_cover: 'None',
  extras_cover: 'None',
  payment_frequency: 'Monthly',
  annual_discount: '5',
  notes: '',
};

// Frontend validation. The backend re-checks everything  howeve3r
function validate(form) {
  const errors = [];
  const needsApplicant2 = form.cover_type === 'Couple' || form.cover_type === 'Family';

  if (!form.customer_name.trim()) errors.push('Customer name is required.');

  const age1 = Number(form.applicant1_age);
  if (form.applicant1_age === '' || !Number.isInteger(age1) || age1 < 18 || age1 > 100) {
    errors.push('Applicant 1 age must be a whole number between 18 and 100.');
  }

  if (needsApplicant2) {
    const age2 = Number(form.applicant2_age);
    if (form.applicant2_age === '' || !Number.isInteger(age2) || age2 < 18 || age2 > 100) {
      errors.push('Applicant 2 age is required (18–100) for Couple or Family cover.');
    }
  }

  if (form.hospital_cover === 'None' && form.extras_cover === 'None') {
    errors.push('Select at least one cover - hospital and extras cannot both be None.');
  }

  if (form.payment_frequency === 'Yearly') {
    const discount = Number(form.annual_discount);
    if (form.annual_discount === '' || Number.isNaN(discount) || discount < 0 || discount > 10) {
      errors.push('Annual discount must be between 0% and 10%.');
    }
  }

  return errors;
}

export default function QuoteForm({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);

  // In edit mode, load the existing record and prefill the form.
  useEffect(() => {
    if (mode !== 'edit') return;
    getQuote(id)
      .then(({ quote }) => {
        setForm({
          customer_name: quote.customer_name,
          cover_type: quote.cover_type,
          applicant1_age: String(quote.applicant1_age),
          applicant1_cover_history: quote.applicant1_cover_history,
          applicant2_age: quote.applicant2_age == null ? '' : String(quote.applicant2_age),
          applicant2_cover_history: quote.applicant2_cover_history ?? 'Yes',
          hospital_cover: quote.hospital_cover,
          extras_cover: quote.extras_cover,
          payment_frequency: quote.payment_frequency,
          annual_discount: String(quote.annual_discount ?? 0),
          notes: quote.notes ?? '',
        });
        setLoading(false);
      })
      .catch((err) => {
        setErrors(err.errors);
        setLoading(false);
      });
  }, [mode, id]);

  const needsApplicant2 = form.cover_type === 'Couple' || form.cover_type === 'Family';
  const isYearly = form.payment_frequency === 'Yearly';

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit() {
    const clientErrors = validate(form);
    if (clientErrors.length > 0) {
      setErrors(clientErrors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Payload build, Applicant 2 is sent as null for Single cover.
    const payload = {
      customer_name: form.customer_name.trim(),
      cover_type: form.cover_type,
      applicant1_age: Number(form.applicant1_age),
      applicant1_cover_history: form.applicant1_cover_history,
      applicant2_age: needsApplicant2 ? Number(form.applicant2_age) : null,
      applicant2_cover_history: needsApplicant2 ? form.applicant2_cover_history : null,
      hospital_cover: form.hospital_cover,
      extras_cover: form.extras_cover,
      payment_frequency: form.payment_frequency,
      annual_discount: isYearly ? Number(form.annual_discount) : 0,
      notes: form.notes.trim(),
    };

    setSaving(true);
    setErrors([]);
    try {
      const data = mode === 'edit'
        ? await updateQuote(id, payload)
        : await createQuote(payload);
      navigate(`/quotes/${data.quote.id}`);
    } catch (err) {
      setErrors(err.errors); // backend validation messages
      setSaving(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  if (loading) return <p className="muted">Loading quote…</p>;

  return (
    <div className="page">
      <h1>{mode === 'edit' ? 'Edit quote' : 'New quote'}</h1>

      {errors.length > 0 && (
        <div className="errors" role="alert">
          <strong>Please fix the following before the quote can be calculated:</strong>
          <ul>
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
      )}

      <div className="main_form">
        <fieldset>
          <legend>Customer</legend>
          <div className="field">
            <label htmlFor="customer_name">Customer name</label>
            <input
              id="customer_name"
              type="text"
              value={form.customer_name}
              onChange={(e) => setField('customer_name', e.target.value)}
              placeholder="e.g. Jordan Nguyen"
            />
          </div>
          <div className="field">
            <label htmlFor="cover_type">Cover type</label>
            <select
              id="cover_type"
              value={form.cover_type}
              onChange={(e) => setField('cover_type', e.target.value)}
            >
              {COVER_TYPES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <p className="hint">
              Couple and Family covers two adults. Family adds an  automatic flat $30/month upgrade fee
              for dependent children 
            </p>
          </div>
        </fieldset>

        <fieldset>
          <legend>Applicant 1</legend>
          <div className="field-row">
            <div className="field">
              <label htmlFor="applicant1_age">Age (18–100)</label>
              <input
                id="applicant1_age"
                type="number"
                min="18"
                max="100"
                value={form.applicant1_age}
                onChange={(e) => setField('applicant1_age', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="applicant1_cover_history">Held hospital cover before?</label>
              <select
                id="applicant1_cover_history"
                value={form.applicant1_cover_history}
                onChange={(e) => setField('applicant1_cover_history', e.target.value)}
              >
                {HISTORY_OPTIONS.map((h) => <option key={h}>{h}</option>)}
              </select>
            </div>
          </div>
        </fieldset>

        {/* Conditional. Applicant 2 fields appear only when Couple or Family is selected. */}
        {needsApplicant2 && (
          <fieldset>
            <legend>Applicant 2</legend>
            <div className="field-row">
              <div className="field">
                <label htmlFor="applicant2_age">Age (18–100)</label>
                <input
                  id="applicant2_age"
                  type="number"
                  min="18"
                  max="100"
                  value={form.applicant2_age}
                  onChange={(e) => setField('applicant2_age', e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="applicant2_cover_history">Held hospital cover before?</label>
                <select
                  id="applicant2_cover_history"
                  value={form.applicant2_cover_history}
                  onChange={(e) => setField('applicant2_cover_history', e.target.value)}
                >
                  {HISTORY_OPTIONS.map((h) => <option key={h}>{h}</option>)}
                </select>
              </div>
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend>Cover levels</legend>
          <div className="field-row">
            <div className="field">
              <label htmlFor="hospital_cover">Hospital cover</label>
              <select
                id="hospital_cover"
                value={form.hospital_cover}
                onChange={(e) => setField('hospital_cover', e.target.value)}
              >
                {HOSPITAL_LEVELS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="extras_cover">Extras cover</label>
              <select
                id="extras_cover"
                value={form.extras_cover}
                onChange={(e) => setField('extras_cover', e.target.value)}
              >
                {EXTRAS_LEVELS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>Payment</legend>
          <div className="field-row">
            <div className="field">
              <label htmlFor="payment_frequency">Payment frequency</label>
              <select
                id="payment_frequency"
                value={form.payment_frequency}
                onChange={(e) => setField('payment_frequency', e.target.value)}
              >
                {PAYMENT_FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            {/* Discount is only relevant when paying Yearly . */}
            {isYearly && (
              <div className="field">
                <label htmlFor="annual_discount">Annual payment discount % (0–10)</label>
                <input
                  id="annual_discount"
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={form.annual_discount}
                  onChange={(e) => setField('annual_discount', e.target.value)}
                />
              </div>
            )}
          </div>
          {!isYearly && (
            <p className="hint">Monthly payers do not receive the annual payment discount.</p>
          )}
        </fieldset>

        <fieldset>
          <legend>Notes (optional)</legend>
          <div className="field">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              rows="3"
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              placeholder="Anything worth remembering about this quote"
            />
          </div>
        </fieldset>

        <div className="actions">
          <button className="btn primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create quote'}
          </button>
          <button className="btn" onClick={() => navigate(-1)} disabled={saving}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

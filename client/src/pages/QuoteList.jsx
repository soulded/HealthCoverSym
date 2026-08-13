import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listQuotes, deleteQuote, formatCreatedAt } from '../api.js';

const fmt = (n) =>
  '$' + Number(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function QuoteList() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    listQuotes()
      .then((rows) => { setQuotes(rows); setError(null); })
      .catch((err) => setError(err.errors.join(' ')))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleDelete(quote) {
    const ok = window.confirm(`Delete the quote for "${quote.customer_name}"? This cannot be undone.`);
    if (!ok) return;
    try {
      await deleteQuote(quote.id);
      load();
    } catch (err) {
      setError(err.errors.join(' '));
    }
  }

  if (loading) return <p className="muted">Loading quotes…</p>;

  return (
    <div className="page">
      <div className="page-head">
        <h1>Quotes</h1>
        <Link to="/new" className="btn primary">New quote</Link>
      </div>

      {error && <div className="errors" role="alert">{error}</div>}

      {quotes.length === 0 ? (
        <div className="breakdown_form empty">
          <p>No quotes yet. Create your first quote to see a full premium breakdown.</p>
          <Link to="/new" className="btn primary">Create a quote</Link>
        </div>
      ) : (
        <div className="breakdown_form">
          <table className="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Cover</th>
                <th>Hospital</th>
                <th>Extras</th>
                <th>Payment</th>
                <th className="num">Monthly premium</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td><Link to={`/quotes/${q.id}`}>{q.customer_name}</Link></td>
                  <td>{q.cover_type}</td>
                  <td>{q.hospital_cover}</td>
                  <td>{q.extras_cover}</td>
                  <td>{q.payment_frequency}</td>
                  <td className="num">{fmt(q.monthly_premium)}</td>
                  <td className="muted">{formatCreatedAt(q.created_at)}</td>
                  <td className="row-actions">
                    <Link to={`/quotes/${q.id}`}>View</Link>
                    <Link to={`/quotes/${q.id}/edit`}>Edit</Link>
                    <button className="link danger" onClick={() => handleDelete(q)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

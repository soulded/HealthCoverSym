// ----------------------------------------------------------------------------
// Express API for HealthCoverSim
//
// Routes:
//   GET    /api/quotes      list all quotes (each with a calculated monthly premium)
//   GET    /api/quotes/:id  one quote + full calculated breakdown
//   POST   /api/quotes      create (validated)
//   PUT    /api/quotes/:id  update (validated)
//   DELETE /api/quotes/:id  delete
//
// Invalid input  → 400 { errors: [...] }
// Unknown id     → 404 { errors: [...] }
// Unexpected     → 500 { errors: [...] }   (caught by the error handler)
// ----------------------------------------------------------------------------

const express = require('express');
const cors = require('cors');
const db = require('./db');
const { validateQuote } = require('./validation');
const { calculateQuote } = require('./quoteCalculator');

const app = express();
app.use(cors());
app.use(express.json());

// Prepared statements, reused for every request. 
const stmts = {
  list: db.prepare('SELECT * FROM quotes ORDER BY created_at DESC, id DESC'),
  get: db.prepare('SELECT * FROM quotes WHERE id = ?'),
  insert: db.prepare(`
    INSERT INTO quotes (
      customer_name, cover_type,
      applicant1_age, applicant1_cover_history,
      applicant2_age, applicant2_cover_history,
      hospital_cover, extras_cover,
      payment_frequency, annual_discount, notes
    ) VALUES (
      @customer_name, @cover_type,
      @applicant1_age, @applicant1_cover_history,
      @applicant2_age, @applicant2_cover_history,
      @hospital_cover, @extras_cover,
      @payment_frequency, @annual_discount, @notes
    )
  `),
  update: db.prepare(`
    UPDATE quotes SET
      customer_name = @customer_name,
      cover_type = @cover_type,
      applicant1_age = @applicant1_age,
      applicant1_cover_history = @applicant1_cover_history,
      applicant2_age = @applicant2_age,
      applicant2_cover_history = @applicant2_cover_history,
      hospital_cover = @hospital_cover,
      extras_cover = @extras_cover,
      payment_frequency = @payment_frequency,
      annual_discount = @annual_discount,
      notes = @notes
    WHERE id = @id
  `),
  delete: db.prepare('DELETE FROM quotes WHERE id = ?'),
};

// List
app.get('/api/quotes', (req, res) => {
  const rows = stmts.list.all();
  // Attach a calculated monthly premium for the list view
  const withSummaries = rows.map((row) => ({
    ...row,
    monthly_premium: calculateQuote(row).monthlyPremium,
  }));
  res.json(withSummaries);
});

// Detail
app.get('/api/quotes/:id', (req, res) => {
  const row = stmts.get.get(req.params.id);
  if (!row) return res.status(404).json({ errors: ['Quote not found.'] });
  res.json({ quote: row, breakdown: calculateQuote(row) });
});

// Create 
app.post('/api/quotes', (req, res) => {
  const result = validateQuote(req.body);
  if (!result.valid) return res.status(400).json({ errors: result.errors });

  const info = stmts.insert.run(result.quote);
  const row = stmts.get.get(info.lastInsertRowid);
  res.status(201).json({ quote: row, breakdown: calculateQuote(row) });
});

// Update 
app.put('/api/quotes/:id', (req, res) => {
  const existing = stmts.get.get(req.params.id);
  if (!existing) return res.status(404).json({ errors: ['Quote not found.'] });

  const result = validateQuote(req.body);
  if (!result.valid) return res.status(400).json({ errors: result.errors });

  stmts.update.run({ ...result.quote, id: existing.id });
  const row = stmts.get.get(existing.id);
  res.json({ quote: row, breakdown: calculateQuote(row) });
});

// Delete 
app.delete('/api/quotes/:id', (req, res) => {
  const existing = stmts.get.get(req.params.id);
  if (!existing) return res.status(404).json({ errors: ['Quote not found.'] });
  stmts.delete.run(existing.id);
  res.json({ deleted: true });
});

// fallbacks
app.use((req, res) => res.status(404).json({ errors: ['Not found.'] }));

// error handler
// with err.status = 400; anything else 500.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed' || err.status === 400) {
    return res.status(400).json({ errors: ['Request body is not valid JSON.'] });
  }
  console.error(err);
  res.status(500).json({ errors: ['Internal server error.'] });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`HealthCoverSim API listening on http://localhost:${PORT}`);
});

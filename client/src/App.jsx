import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import QuoteList from './pages/QuoteList.jsx';
import QuoteForm from './pages/QuoteForm.jsx';
import QuoteDetail from './pages/QuoteDetail.jsx';

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/" className="brand">
            HealthCover<span>Sim</span>
          </NavLink>
          <nav>
            <NavLink to="/" end>Quotes</NavLink>
            <NavLink to="/new">New quote</NavLink>
          </nav>
        </div>
      </header>

      <main className="container">
        <Routes>
          <Route path="/" element={<QuoteList />} />
          <Route path="/new" element={<QuoteForm mode="create" />} />
          <Route path="/quotes/:id" element={<QuoteDetail />} />
          <Route path="/quotes/:id/edit" element={<QuoteForm mode="edit" />} />
        </Routes>
      </main>

      <footer className="footer">
        This is a learning simulator only. It is not financial advice and does not need to match any real insurer's pricing.
      </footer>
    </div>
  );
}

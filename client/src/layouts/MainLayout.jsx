import Navbar from '../components/Navbar';

export default function MainLayout({ children }) {
  return (
    <div className="main-layout">
      <Navbar />
      <main className="main-content">
        {children}
      </main>
      <footer className="main-footer">
        <div className="page-container">
          <div className="footer-inner">
            <span className="label-coord">TRAIL.OF.SECRET // OPERATIVE SYSTEM</span>
            <span className="label-coord" style={{ color: 'var(--outline-variant)' }}>
              ENCRYPTED CHANNEL ACTIVE
            </span>
          </div>
        </div>
      </footer>

      <style>{`
        .main-layout { display: flex; flex-direction: column; min-height: 100vh; }
        .main-content { flex: 1; padding: var(--space-xl) 0; }
        .main-footer {
          border-top: 1px solid var(--outline-variant);
          background: var(--surface-low);
          padding: var(--space-md) 0;
          margin-top: auto;
        }
        .footer-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
      `}</style>
    </div>
  );
}

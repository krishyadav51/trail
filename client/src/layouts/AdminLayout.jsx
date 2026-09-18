import Navbar from '../components/Navbar';
import AdminSidebar from '../components/AdminSidebar';

export default function AdminLayout({ children }) {
  return (
    <div className="admin-layout">
      <Navbar />
      <div className="admin-body">
        <AdminSidebar />
        <main className="admin-main">
          {children}
        </main>
      </div>

      <style>{`
        .admin-layout { display: flex; flex-direction: column; min-height: 100vh; }
        .admin-body {
          display: flex;
          flex: 1;
          align-items: flex-start;
        }
        .admin-main {
          flex: 1;
          padding: var(--space-xl) var(--space-lg);
          min-width: 0;
        }
        @media (max-width: 768px) {
          .admin-body { flex-direction: column; }
          .admin-main { padding: var(--space-lg) var(--margin-mobile); }
        }
      `}</style>
    </div>
  );
}

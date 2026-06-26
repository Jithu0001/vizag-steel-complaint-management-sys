import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar />
        <main style={{
          flex: 1, padding: 'var(--space-6)', overflowY: 'auto',
          background: 'var(--color-bg-primary)',
        }}>
          <div className="fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}

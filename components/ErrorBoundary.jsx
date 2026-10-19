'use client';
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { conError: false };
  }

  static getDerivedStateFromError() {
    return { conError: true };
  }

  componentDidCatch(error) {
    console.error('Error atrapado por ErrorBoundary:', error);
  }

  render() {
    if (this.state.conError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: '16px', fontFamily: 'sans-serif', textAlign: 'center', padding: '24px'
        }}>
          <p style={{ fontSize: '18px', fontWeight: 500 }}> Algo salió mal</p>
          <p style={{ fontSize: '14px', opacity: 0.7, maxWidth: '400px' }}>
            Puede ser una actualización reciente de la app. Recargá la página para solucionarlo.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px',
              padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'
            }}
          >
            Recargar página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import React from 'react';

export default function BrandFooter() {
  return (
    <footer className="brand-signature-footer">
      <div className="signature-content">
        {/* Item 1: Flag & Kicker */}
        <div className="signature-flag-label">
          <span className="signature-flag">🇮🇳</span>
          <span className="signature-kicker">ENGINEERED IN INDIA</span>
        </div>
        
        {/* Item 2: Headline */}
        <h2 className="signature-primary">
          Made with <span className="signature-heart">❤️</span> in India
        </h2>
        
        {/* Item 3: Brand Philosophy */}
        <p className="signature-secondary">
          Built for the People Who Build Stronger People.
        </p>
        
        {/* Item 4: Brand Group */}
        <div className="signature-brand-group">
          <h1 className="signature-brand-name font-ethnocentric">GymDeck</h1>
          <p className="signature-brand-descriptor">FITNESS MANAGEMENT PLATFORM</p>
        </div>
      </div>
    </footer>
  );
}

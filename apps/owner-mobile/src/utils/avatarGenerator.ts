/**
 * GymDeck - Premium Default Avatar SVG Generator
 *
 * Generates identical deterministic, stylized SVG avatars matching the GymDeck Desktop application.
 * Supports Female, Male, and Other/Non-binary presets with hair, face, clothes, shading, and glowing accents.
 */

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function getDefaultAvatarXml(gender?: string | null, seed?: string | null): string {
  const femaleHairs = ['#4A3728', '#5C4033', '#1A120B', '#8A4F3D', '#C68B59', '#2D3748'];
  const maleHairs = ['#2E3A59', '#1A2530', '#2A1F1D', '#4A3728', '#7C8594', '#111827'];
  const beanies = ['#059669', '#4F46E5', '#FF6B8B', '#D97706', '#0891B2'];

  const hash = hashCode(seed || 'Member');
  const g = (gender || '').toLowerCase().trim();

  if (g === 'female' || g === 'f' || g === 'woman' || g === 'girl') {
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="feBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FF9a9e"/>
          <stop offset="100%" stop-color="#fecfef"/>
        </linearGradient>
        <linearGradient id="feSkin" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#FFF5F0"/>
          <stop offset="100%" stop-color="#FAD9C1"/>
        </linearGradient>
        <linearGradient id="feHair" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#4A2E80"/>
          <stop offset="100%" stop-color="#241445"/>
        </linearGradient>
        <linearGradient id="feShirt" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#FF5E62"/>
          <stop offset="100%" stop-color="#FF9966"/>
        </linearGradient>
        <radialGradient id="feCheek" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#FF8A8A" stop-opacity="0.6"/>
          <stop offset="100%" stop-color="#FF8A8A" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#feBg)"/>
      <path d="M25,50 Q18,72 32,88 Q50,75 68,88 Q82,72 75,50 C75,30 25,30 25,50 Z" fill="url(#feHair)"/>
      <rect x="46" y="55" width="8" height="15" rx="3" fill="url(#feSkin)"/>
      <rect x="46" y="55" width="8" height="3" fill="#000000" opacity="0.08"/>
      <circle cx="50" cy="45" r="20" fill="url(#feSkin)"/>
      <path d="M36,43 Q41,39 44,43" stroke="#2D2D2D" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path d="M56,43 Q59,39 64,43" stroke="#2D2D2D" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <circle cx="40" cy="45" r="2" fill="#1E1E1E"/>
      <circle cx="60" cy="45" r="2" fill="#1E1E1E"/>
      <circle cx="37" cy="49" r="4.5" fill="url(#feCheek)"/>
      <circle cx="63" cy="49" r="4.5" fill="url(#feCheek)"/>
      <path d="M46,51 Q50,55 54,51" stroke="#2D2D2D" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <path d="M30,40 C34,26 44,24 50,30 C56,24 66,26 70,40 C75,48 74,58 74,62 C74,62 67,38 50,38 C33,38 26,62 26,62 C26,62 25,48 30,40 Z" fill="url(#feHair)"/>
      <path d="M22,86 C22,74 34,68 50,68 C66,68 78,74 78,86 Z" fill="url(#feShirt)"/>
      <path d="M44,68 L50,75 L56,68 Z" fill="url(#feSkin)"/>
      <path d="M10,30 A45,45 0 0,1 90,30 A45,35 0 0,0 10,30 Z" fill="#FFFFFF" opacity="0.15"/>
    </svg>`;
  }

  if (g === 'male' || g === 'm' || g === 'man' || g === 'boy' || (!g && hash % 2 === 0)) {
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="maBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#2193b0"/>
          <stop offset="100%" stop-color="#6dd5ed"/>
        </linearGradient>
        <linearGradient id="maSkin" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#FFF5F0"/>
          <stop offset="100%" stop-color="#E8C1A5"/>
        </linearGradient>
        <linearGradient id="maHair" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#3A3F47"/>
          <stop offset="100%" stop-color="#1E2229"/>
        </linearGradient>
        <linearGradient id="maShirt" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#3F5EFB"/>
          <stop offset="100%" stop-color="#FC466B"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#maBg)"/>
      <rect x="46" y="55" width="8" height="15" rx="3" fill="url(#maSkin)"/>
      <rect x="46" y="55" width="8" height="3" fill="#000000" opacity="0.08"/>
      <circle cx="50" cy="45" r="20" fill="url(#maSkin)"/>
      <circle cx="40" cy="44" r="2.2" fill="#1E1E1E"/>
      <circle cx="60" cy="44" r="2.2" fill="#1E1E1E"/>
      <path d="M36,39 Q41,36 45,39" stroke="#1E1E1E" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path d="M55,39 Q59,36 64,39" stroke="#1E1E1E" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path d="M45,51 Q50,55 55,51" stroke="#2D2D2D" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <path d="M30,35 C28,30 32,22 40,20 C43,15 48,15 52,18 C57,15 65,18 68,22 C72,26 71,32 70,36 C70,36 71,40 69,42 C68,40 68,36 67,36 C64,28 36,28 33,36 C32,36 32,40 31,42 C29,40 30,35 30,35 Z" fill="url(#maHair)"/>
      <path d="M30,32 L32,38 L34,32" stroke="url(#maHair)" stroke-width="2" fill="url(#maHair)"/>
      <path d="M68,32 L66,38 L64,32" stroke="url(#maHair)" stroke-width="2" fill="url(#maHair)"/>
      <path d="M22,86 C22,74 34,68 50,68 C66,68 78,74 78,86 Z" fill="url(#maShirt)"/>
      <path d="M42,68 L50,77 L45,68 Z" fill="#FFFFFF" opacity="0.35"/>
      <path d="M58,68 L50,77 L55,68 Z" fill="#FFFFFF" opacity="0.35"/>
      <path d="M10,30 A45,45 0 0,1 90,30 A45,35 0 0,0 10,30 Z" fill="#FFFFFF" opacity="0.15"/>
    </svg>`;
  }

  // Non-binary / Other / Unisex Beanie Preset
  const beanie = beanies[hash % beanies.length];
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="otBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#11998e"/>
        <stop offset="100%" stop-color="#38ef7d"/>
      </linearGradient>
      <linearGradient id="otSkin" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#FFF5F0"/>
        <stop offset="100%" stop-color="#E2B899"/>
      </linearGradient>
      <linearGradient id="otBeanie" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ff9966"/>
        <stop offset="100%" stop-color="#ff5e62"/>
      </linearGradient>
      <linearGradient id="otShirt" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#4A00E0"/>
        <stop offset="100%" stop-color="#8E2DE2"/>
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="50" fill="url(#otBg)"/>
    <rect x="46" y="55" width="8" height="15" rx="3" fill="url(#otSkin)"/>
    <rect x="46" y="55" width="8" height="3" fill="#000000" opacity="0.08"/>
    <circle cx="50" cy="45" r="20" fill="url(#otSkin)"/>
    <circle cx="41" cy="44" r="5.5" stroke="#2D2D2D" stroke-width="1.8" fill="#FFFFFF" fill-opacity="0.12"/>
    <circle cx="59" cy="44" r="5.5" stroke="#2D2D2D" stroke-width="1.8" fill="#FFFFFF" fill-opacity="0.12"/>
    <line x1="46.5" y1="44" x2="53.5" y2="44" stroke="#2D2D2D" stroke-width="1.8"/>
    <path d="M35.5,43 Q38,40 40,43" stroke="#2D2D2D" stroke-width="1" fill="none"/>
    <path d="M64.5,43 Q62,40 60,43" stroke="#2D2D2D" stroke-width="1" fill="none"/>
    <circle cx="41" cy="44" r="1.5" fill="#1E1E1E"/>
    <circle cx="59" cy="44" r="1.5" fill="#1E1E1E"/>
    <path d="M46,52 Q50,56 54,52" stroke="#2D2D2D" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <circle cx="50" cy="23" r="7" fill="url(#otBeanie)"/>
    <path d="M28,40 C32,27 40,24 50,24 C60,24 68,27 72,40 C65,36 35,36 28,40 Z" fill="url(#otBeanie)"/>
    <path d="M22,86 C22,74 34,68 50,68 C66,68 78,74 78,86 Z" fill="url(#otShirt)"/>
    <line x1="46" y1="74" x2="46" y2="82" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/>
    <line x1="54" y1="74" x2="54" y2="82" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/>
    <path d="M10,30 A45,45 0 0,1 90,30 A45,35 0 0,0 10,30 Z" fill="#FFFFFF" opacity="0.15"/>
  </svg>`;
}

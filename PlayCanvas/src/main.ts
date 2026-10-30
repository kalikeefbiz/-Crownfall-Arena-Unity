import './style.css';
import './ui/frontend.css';
import './ui/performance-monitor.css';

// Only the dedicated device-preview build chooses this default entry.
if (import.meta.env.VITE_DEVICE_PREVIEW === '1') {
    const entry = new URL(location.href);
    entry.searchParams.set('mapPreview', 'solrahn-v2');
    entry.searchParams.set('surface', 'goal017');
    entry.searchParams.set('devicePreview', '1');
    entry.searchParams.set('frontend', '1');
    history.replaceState(null, '', entry);
}

// Explicit developer/verification entry retains the established inspection harness.
// Public entry imports neither PlayCanvas nor the simulation before confirmation.
const query = new URLSearchParams(location.search);
if (query.get('debug') === '1' || (query.get('verify') === '1' && query.get('frontend') !== '1')) {
    const { createGame } = await import('./game');
    await createGame();
} else {
    const { createFrontend } = await import('./ui/frontend');
    createFrontend();
}

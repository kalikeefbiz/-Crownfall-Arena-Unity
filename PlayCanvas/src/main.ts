import './style.css';
import './ui/frontend.css';

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

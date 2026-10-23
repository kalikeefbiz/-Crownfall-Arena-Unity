// Scope Safari gesture/default suppression to gameplay surfaces. Menus, settings
// and the viewport keep native zoom and accessibility behavior.
export function protectGameSurface(surface, signal) {
    const prevent = (event) => {
        if (event.cancelable) event.preventDefault();
    };
    for (const type of [
        'touchstart',
        'touchmove',
        'touchend',
        'gesturestart',
        'gesturechange',
        'dblclick',
        'contextmenu',
        'selectstart',
        'dragstart'
    ])
        surface.addEventListener(type, prevent, { passive: false, signal });
}

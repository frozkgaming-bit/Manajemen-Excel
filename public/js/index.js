import { router } from './router.js';
import { initAuth } from './modules/auth.js';

document.addEventListener('DOMContentLoaded', () => {
    router();
    initAuth();
});
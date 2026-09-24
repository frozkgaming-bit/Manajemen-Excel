import Login from './pages/Login.js';
import Dashboard from './pages/Dashboard.js';
import NotFound from './pages/NotFound.js';
import { supabaseClient } from './config/supabase.js';

const routes = {
  '#/login': Login,
  '#/dashboard': Dashboard,
};

export async function router() {
    let hash = window.location.hash || '#/login';
    const appContainer = document.getElementById('app');
    const navContainer = document.getElementById('nav-container');

    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session && hash !== '#/login') {
        window.location.hash = '#/login';
        return;
    }
    if (session && hash === '#/login') {
        window.location.hash = '#/dashboard';
        return;
    }
    if (appContainer) {
        const pageComponent = routes[hash] || NotFound;

        if (hash !== '#/dashboard' && navContainer) {
            navContainer.innerHTML = '';
        }

        appContainer.innerHTML = typeof pageComponent.render === 'function'
            ? pageComponent.render()
            : pageComponent();

        window.scrollTo(0, 0);

        if (typeof pageComponent.init === 'function') {
            pageComponent.init();
        }
    }
}

export function navigate(path) {
    window.location.hash = path;
}

window.addEventListener('hashchange', router);
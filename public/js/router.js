import Login from './pages/Login.js';
import Dashboard from './pages/Dashboard.js';
import NotFound from './pages/NotFound.js';

const routes = {
  '#/login': Login,
  '#/dashboard': Dashboard,
};

export function router() {
  const hash = window.location.hash || '#/login';
  const page = routes[hash] || (() => import('./pages/NotFound.js').then(m => m.default()));
  
  const appContainer = document.getElementById('app');
  if (appContainer) {
    const pageComponent = routes[hash] || (() => import('./pages/NotFound.js').then(m => m.default()));
    Promise.resolve(pageComponent()).then(component => {
      if (typeof component === 'function') {
        appContainer.innerHTML = component();
      } else {
        appContainer.innerHTML = component;
      }
      window.scrollTo(0, 0);
    });
  }
}

export function navigate(path) {
  window.location.hash = path;
}

window.addEventListener('hashchange', router);
window.addEventListener('load', router);
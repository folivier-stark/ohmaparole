const routes = {};
let baseCtx = {};
let cleanup = null;
let renderToken = 0;

export function defineRoutes(map, ctx) {
  Object.assign(routes, map);
  baseCtx = ctx;
}

/** replace : remplace l'entrée d'historique (le retour Android ne relance pas une séance). */
export function navigate(path, { replace = false } = {}) {
  if (location.hash === `#${path}`) render();
  else if (replace) location.replace(`#${path}`);
  else location.hash = path;
}

async function render() {
  const token = ++renderToken;
  const [name = 'home', ...params] = (location.hash.slice(2) || 'home').split('/');
  const screen = routes[name] ?? routes.home;
  try { cleanup?.(); } catch (e) { console.error(e); }
  cleanup = null;
  // Conteneur neuf à chaque rendu : un rendu périmé écrit dans un nœud détaché, jamais à l'écran.
  const app = document.getElementById('app');
  const root = document.createElement('div');
  root.className = 'screen';
  app.replaceChildren(root);
  window.scrollTo(0, 0);
  const result = await screen.render(root, { ...baseCtx, params, navigate });
  if (typeof result !== 'function') return;
  if (token === renderToken) cleanup = result;
  else result();
}

export function startRouter() {
  addEventListener('hashchange', render);
  render();
}

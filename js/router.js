const routes = {};
let baseCtx = {};
let cleanup = null;
let renderToken = 0;

export function defineRoutes(map, ctx) {
  Object.assign(routes, map);
  baseCtx = ctx;
}

export function navigate(path) {
  if (location.hash === `#${path}`) render();
  else location.hash = path;
}

async function render() {
  const token = ++renderToken;
  const [name = 'home', ...params] = (location.hash.slice(2) || 'home').split('/');
  const screen = routes[name] ?? routes.home;
  try { cleanup?.(); } catch (e) { console.error(e); }
  cleanup = null;
  const root = document.getElementById('app');
  root.replaceChildren();
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

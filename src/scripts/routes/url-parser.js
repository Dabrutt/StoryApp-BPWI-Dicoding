function splitPath(path) {
  const segments = path.split("/").filter(Boolean);
  return {
    resource: segments[0] || null,
    id: segments[1] || null,
  };
}

function buildRoute({ resource, id }) {
  let result = "";

  if (resource) result += `/${resource}`;
  if (id) result += "/:id";

  return result || "/";
}

export function getActivePath() {
  const hash = window.location.hash.slice(1);
  return hash || "/";
}

export function getActiveRoute() {
  const path = getActivePath();
  const segments = splitPath(path);
  return buildRoute(segments);
}

export function parseActivePath() {
  return splitPath(getActivePath());
}

export function getRoute(path) {
  return buildRoute(splitPath(path));
}

export function parsePath(path) {
  return splitPath(path);
}

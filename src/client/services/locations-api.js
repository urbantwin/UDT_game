function getApiBase() {
  if (import.meta.env.DEV) {
    return `${location.protocol}//${location.hostname}:3001`;
  }
  return '';
}

export async function getLocationOverrides() {
  const res = await fetch(`${getApiBase()}/api/locations/overrides`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Impossible de charger les overrides.');
  return data; // [{ locationId, label, lat, lng }]
}

export type LatLng = { lat: number; lng: number }

const EARTH_RADIUS_KM = 6371

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

// Great-circle distance between two points in kilometres (Haversine). Accurate
// enough for "which store is closer to me" — we never need sub-metre precision.
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

// Localised (pt-BR) distance label: metres under 1 km ("a 850 m"), one decimal
// up to 10 km ("a 1,2 km"), whole kilometres beyond ("a 152 km"). The decimal
// separator is a comma to match Brazilian conventions.
export function formatDistanceKm(km: number): string {
  if (km < 1) {
    const metres = Math.round((km * 1000) / 10) * 10
    return `${metres} m`
  }
  if (km < 10) {
    return `${km.toFixed(1).replace(".", ",")} km`
  }
  return `${Math.round(km)} km`
}

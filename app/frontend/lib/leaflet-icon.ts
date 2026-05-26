import L from "leaflet"
import iconUrl from "leaflet/dist/images/marker-icon.png"
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png"
import shadowUrl from "leaflet/dist/images/marker-shadow.png"

L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

export const defaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

// Enlarged variant for the merchant the customer has selected (from a card or a
// previous marker tap), so the map visibly reflects the list selection.
export const selectedIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [33, 54],
  iconAnchor: [16, 54],
  popupAnchor: [1, -46],
  shadowSize: [54, 54],
})

import { Geolocation } from '@capacitor/geolocation'

export async function requestLocationPermission() {
  try {
    const permissions = await Geolocation.checkPermissions()

    if (permissions.location === 'granted') {
      return true
    }

    const request = await Geolocation.requestPermissions()

    return request.location === 'granted'
  } catch (err) {
    console.error('Location permission error:', err)
    return false
  }
}

export async function getCurrentLocation() {
  const granted = await requestLocationPermission()

  if (!granted) {
    throw new Error('Location permission denied')
  }

  const position = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0,
  })

  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  }
}

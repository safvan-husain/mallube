export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const r = 6371; // Radius of the Earth in kilometers
    const p = Math.PI / 180; // Convert degrees to radians
  
    const dLat = (lat2 - lat1) * p;
    const dLon = (lon2 - lon1) * p;
    const lat1Rad = lat1 * p;
    const lat2Rad = lat2 * p;
  
    const a =
      0.5 - Math.cos(dLat) / 2 +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) *
      (1 - Math.cos(dLon)) / 2;
  
    const distance = 2 * r * Math.asin(Math.sqrt(a));
    const distanceInMeters = distance * 1000; // Convert to meters
  
    return distanceInMeters;
  }
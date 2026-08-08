import { BusinessRuleError } from '../shared/errors/domain-error';

const BOLIVIA_BOUNDS = {
  south: -22.9,
  north: -9.6,
  west: -69.6,
  east: -57.4,
} as const;

const BOLIVIA_OUTLINE: ReadonlyArray<readonly [number, number]> = [
  [-9.68, -68.58],
  [-10.0, -67.5],
  [-10.5, -65.5],
  [-10.95, -65.0],
  [-11.0, -62.5],
  [-11.4, -60.0],
  [-12.5, -58.5],
  [-14.0, -58.0],
  [-15.5, -57.6],
  [-17.0, -57.5],
  [-18.5, -57.8],
  [-20.0, -58.2],
  [-21.0, -60.0],
  [-22.0, -61.5],
  [-22.9, -62.65],
  [-22.9, -64.0],
  [-22.8, -65.5],
  [-22.0, -66.5],
  [-21.0, -67.5],
  [-20.0, -68.0],
  [-19.0, -68.4],
  [-18.0, -69.0],
  [-17.0, -69.6],
  [-15.5, -69.6],
  [-14.5, -69.0],
  [-13.0, -69.0],
  [-11.5, -69.0],
];

export class GeoPoint {
  private constructor(
    readonly latitude: number,
    readonly longitude: number,
  ) {}

  static inBolivia(latitude: number, longitude: number) {
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < BOLIVIA_BOUNDS.south ||
      latitude > BOLIVIA_BOUNDS.north ||
      longitude < BOLIVIA_BOUNDS.west ||
      longitude > BOLIVIA_BOUNDS.east ||
      !isInsideOutline(latitude, longitude)
    ) {
      throw new BusinessRuleError(
        'La ubicación del servicio debe estar dentro de Bolivia',
      );
    }

    return new GeoPoint(latitude, longitude);
  }
}

function isInsideOutline(latitude: number, longitude: number) {
  let inside = false;
  for (
    let current = 0, previous = BOLIVIA_OUTLINE.length - 1;
    current < BOLIVIA_OUTLINE.length;
    previous = current++
  ) {
    const [currentLatitude, currentLongitude] = BOLIVIA_OUTLINE[current];
    const [previousLatitude, previousLongitude] = BOLIVIA_OUTLINE[previous];
    const intersects =
      currentLongitude > longitude !== previousLongitude > longitude &&
      latitude <
        ((previousLatitude - currentLatitude) *
          (longitude - currentLongitude)) /
          (previousLongitude - currentLongitude) +
          currentLatitude;
    if (intersects) inside = !inside;
  }
  return inside;
}

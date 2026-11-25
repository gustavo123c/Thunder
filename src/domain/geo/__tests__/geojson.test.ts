import { continueTrack, straightTrack } from '../../testing/track-builder';
import { boundsOf, projectToBox, samplesToMultiLineString } from '../geojson';

describe('samplesToMultiLineString', () => {
  it('splits lines at pauses and drops single-point segments', () => {
    const first = straightTrack({ speedMps: 3, durationS: 4 });
    const lonely = continueTrack(first, { speedMps: 3, durationS: 0, segment: 1, gapS: 10 });
    const second = continueTrack(lonely, { speedMps: 3, durationS: 2, segment: 2, gapS: 10 });

    const geometry = samplesToMultiLineString([...first, ...lonely, ...second]);
    expect(geometry.type).toBe('MultiLineString');
    expect(geometry.coordinates.map((line) => line.length)).toEqual([5, 3]);
    expect(geometry.coordinates[0]?.[0]).toEqual([first[0]!.longitude, first[0]!.latitude]);
  });

  it('is empty without enough points', () => {
    expect(samplesToMultiLineString([]).coordinates).toEqual([]);
  });
});

describe('boundsOf', () => {
  it('returns north-east and south-west corners', () => {
    expect(
      boundsOf([
        [-46.6, -23.5],
        [-46.7, -23.6],
        [-46.65, -23.4],
      ]),
    ).toEqual({ ne: [-46.6, -23.4], sw: [-46.7, -23.6] });
    expect(boundsOf([])).toBeNull();
  });
});

describe('projectToBox', () => {
  it('fits a route inside the box, centered, with north up', () => {
    const points = projectToBox(
      [
        [0, 0],
        [0, 0.01], // north
      ],
      100,
      50,
      5,
    );
    const [[x0, y0], [x1, y1]] = points as [[number, number], [number, number]];
    expect(x0).toBeCloseTo(50, 6);
    expect(x1).toBeCloseTo(50, 6);
    expect(y0).toBeCloseTo(45, 6); // south at the bottom
    expect(y1).toBeCloseTo(5, 6);
  });

  it('handles a single point without dividing by zero', () => {
    expect(projectToBox([[10, 10]], 100, 100)).toEqual([[50, 50]]);
  });
});

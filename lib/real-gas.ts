type Gas = { tc: number; pc: number; omega: number };

export const GASES: Record<string, Gas> = {
  CO2: { tc: 304.13, pc: 73.77, omega: 0.224 },
  N2: { tc: 126.2, pc: 33.98, omega: 0.037 },
  He: { tc: 5.2, pc: 2.27, omega: -0.39 },
  SampleX: { tc: 405.4, pc: 113.5, omega: 0.25 },
};

const R = 0.08314462618; // L bar mol-1 K-1

function cubicRoots(a: number, b: number, c: number): number[] {
  const p = b - (a * a) / 3;
  const q = (2 * a * a * a) / 27 - (a * b) / 3 + c;
  const discriminant = (q * q) / 4 + (p * p * p) / 27;
  if (discriminant >= 0) {
    const s = Math.sqrt(discriminant);
    const u = Math.cbrt(-q / 2 + s);
    const v = Math.cbrt(-q / 2 - s);
    return [u + v - a / 3];
  }
  const radius = 2 * Math.sqrt(-p / 3);
  const theta = Math.acos((-q / 2) / Math.sqrt(-(p * p * p) / 27));
  return [0, 1, 2].map(
    (k) => radius * Math.cos((theta + 2 * Math.PI * k) / 3) - a / 3,
  );
}

export function compressibility(
  temperature: number,
  pressure: number,
  gas: Gas = GASES.CO2,
) {
  const kappa =
    0.37464 + 1.54226 * gas.omega - 0.26992 * gas.omega * gas.omega;
  const alpha = Math.pow(
    1 + kappa * (1 - Math.sqrt(temperature / gas.tc)),
    2,
  );
  const a = (0.45724 * R * R * gas.tc * gas.tc * alpha) / gas.pc;
  const b = (0.0778 * R * gas.tc) / gas.pc;
  const A = (a * pressure) / (R * R * temperature * temperature);
  const B = (b * pressure) / (R * temperature);
  const roots = cubicRoots(
    -(1 - B),
    A - 3 * B * B - 2 * B,
    -(A * B - B * B - B * B * B),
  ).filter((root) => Number.isFinite(root) && root > B);
  return Math.max(...roots);
}

export function gasResult(
  temperature: number,
  pressure: number,
  gas: Gas = GASES.CO2,
) {
  const z = compressibility(temperature, pressure, gas);
  return { z, deviation: (z - 1) * 100 };
}

export function repairPressure(temperature: number, volume: number, attractions: boolean, finite: boolean) {
  // One mole of CO₂. Pressure in bar and volume in litres.
  const ideal = R * temperature / volume;
  const model = R * temperature / (volume - (finite ? 0.04267 : 0))
    - (attractions ? 3.640 / volume ** 2 : 0);
  return { ideal, model, deviation: 100 * (model - ideal) / ideal };
}

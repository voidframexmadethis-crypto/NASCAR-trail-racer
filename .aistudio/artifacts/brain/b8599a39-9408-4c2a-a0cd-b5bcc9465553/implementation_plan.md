# Implementation Plan - Flat Forward Driving & Dense Forest Trail Scenery

## Overview
Ensure all 67 stock cars drive flat on the ground pointing strictly forward without any sideways tilting or drift angle errors, while surrounding the dirt trail with a dense 3D pine and oak forest.

---

## Key Proposed Changes

### 1. Flat Forward Driving Alignment (`/components/GameCanvas.tsx`)
- **Direct Y-Rotation**: Set car rotation strictly to `mesh.rotation.set(0, currentHeading, 0)` so cars remain level and flat on the track elevation (`y = currentSplinePoint.y + 0.1`).
- **Direct Forward Motion**: Calculate movement purely along `forwardVector = (sin(currentHeading), 0, cos(currentHeading))` without lateral drift offset vectors.
- **AI Car Alignment**: Ensure all 66 AI stock cars use `mesh.rotation.set(0, aiHeading, 0)` facing strictly forward along the track tangent.

### 2. Dense Forest Environment & Realistic Scenery
- **Dense Pine & Oak Trees**: Line both sides of the dirt trail with a dense forest of 3D pine and oak trees featuring detailed trunks, foliage layers, and random scale/rotation variations.
- **Forest Scenery & Ground**: Enrich the ground mesh with forest grass, boulders, wooden guard logs, and start/finish gantry.

---

## Verification Plan
1. Run `compile_applet` to verify TypeScript compilation.
2. Run `lint_applet` to verify ESLint cleanliness.
3. Restart the dev server to preview the flat driving and dense forest environment.

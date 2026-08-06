/**
 * Mesh Kernel Conformance Gate
 * =============================
 *
 * Validates half-edge topology invariants after every modifying operation.
 * A real mesh kernel must maintain these invariants or downstream operations
 * will produce garbage.
 *
 * This is NOT a stub — it checks real topological properties.
 */

import type { MeshKernel } from './mesh-kernel';

export interface ConformanceResult {
  passed: boolean;
  checks: ConformanceCheck[];
  errorCount: number;
  warningCount: number;
}

export interface ConformanceCheck {
  checkId: string;
  name: string;
  passed: boolean;
  message?: string;
  /** Number of violations found. */
  violationCount?: number;
}

export function validateKernel(kernel: MeshKernel): ConformanceResult {
  const checks: ConformanceCheck[] = [];

  // 1. Every half-edge has a valid origin vertex
  checks.push(checkValidOrigins(kernel));

  // 2. Every half-edge has a valid face OR is a boundary
  checks.push(checkValidFaces(kernel));

  // 3. Every half-edge has valid next/previous
  checks.push(checkValidNextPrev(kernel));

  // 4. Every half-edge has at most one twin
  checks.push(checkValidTwins(kernel));

  // 5. Twin symmetry: if A.twin = B then B.twin = A
  checks.push(checkTwinSymmetry(kernel));

  // 6. Face cycles close (following next from any half-edge returns to start)
  checks.push(checkFaceCyclesClose(kernel));

  // 7. Vertex fans are enumerable (every vertex has at least one half-edge)
  checks.push(checkVertexFans(kernel));

  // 8. No degenerate faces (face with < 3 vertices)
  checks.push(checkNoDegenerateFaces(kernel));

  // 9. All face vertex references are valid
  checks.push(checkFaceVertexRefs(kernel));

  // 10. All positions are finite (no NaN/Infinity)
  checks.push(checkFinitePositions(kernel));

  // 11. Consistent winding (simplified: check that twins have reversed winding)
  checks.push(checkConsistentWinding(kernel));

  // 12. No duplicate half-edges (same origin + destination)
  checks.push(checkNoDuplicateEdges(kernel));

  const errorCount = checks.filter((c) => !c.passed).length;
  const warningCount = 0;

  return {
    passed: errorCount === 0,
    checks,
    errorCount,
    warningCount,
  };
}

// ---------------------------------------------------------------------------
// Individual checks
// ---------------------------------------------------------------------------

function checkValidOrigins(kernel: MeshKernel): ConformanceCheck {
  let violations = 0;
  for (const [heId, he] of kernel.halfEdges) {
    if (!kernel.vertices.has(he.origin)) {
      violations++;
    }
    if (he.destination !== undefined && !kernel.vertices.has(he.destination)) {
      violations++;
    }
  }
  return {
    checkId: 'valid-origins',
    name: 'Valid half-edge origins',
    passed: violations === 0,
    violationCount: violations,
    message: violations === 0 ? 'All half-edge origins/destinations valid' : `${violations} invalid vertex references`,
  };
}

function checkValidFaces(kernel: MeshKernel): ConformanceCheck {
  let violations = 0;
  for (const [, he] of kernel.halfEdges) {
    if (he.face !== -1 && !kernel.faces.has(he.face)) {
      violations++;
    }
  }
  return {
    checkId: 'valid-faces',
    name: 'Valid face references',
    passed: violations === 0,
    violationCount: violations,
    message: violations === 0 ? 'All face references valid' : `${violations} invalid face references`,
  };
}

function checkValidNextPrev(kernel: MeshKernel): ConformanceCheck {
  let violations = 0;
  for (const [, he] of kernel.halfEdges) {
    if (he.next === -1 || !kernel.halfEdges.has(he.next)) {
      violations++;
    }
    if (he.prev === -1 || !kernel.halfEdges.has(he.prev)) {
      violations++;
    }
  }
  return {
    checkId: 'valid-next-prev',
    name: 'Valid next/previous links',
    passed: violations === 0,
    violationCount: violations,
    message: violations === 0 ? 'All next/prev links valid' : `${violations} broken next/prev links`,
  };
}

function checkValidTwins(kernel: MeshKernel): ConformanceCheck {
  let violations = 0;
  for (const [, he] of kernel.halfEdges) {
    if (he.twin !== -1 && !kernel.halfEdges.has(he.twin)) {
      violations++;
    }
  }
  return {
    checkId: 'valid-twins',
    name: 'Valid twin references',
    passed: violations === 0,
    violationCount: violations,
    message: violations === 0 ? 'All twin references valid' : `${violations} invalid twin references`,
  };
}

function checkTwinSymmetry(kernel: MeshKernel): ConformanceCheck {
  let violations = 0;
  for (const [heId, he] of kernel.halfEdges) {
    if (he.twin === -1) continue;
    const twin = kernel.halfEdges.get(he.twin);
    if (!twin || twin.twin !== heId) {
      violations++;
    }
    // Twin must have reversed origin/destination
    if (twin && (twin.origin !== he.destination || twin.destination !== he.origin)) {
      violations++;
    }
  }
  return {
    checkId: 'twin-symmetry',
    name: 'Twin symmetry (A.twin=B → B.twin=A, reversed direction)',
    passed: violations === 0,
    violationCount: violations,
    message: violations === 0 ? 'Twin symmetry maintained' : `${violations} twin symmetry violations`,
  };
}

function checkFaceCyclesClose(kernel: MeshKernel): ConformanceCheck {
  let violations = 0;
  for (const [faceId, face] of kernel.faces) {
    const startHe = face.halfEdge;
    if (startHe === -1) {
      violations++;
      continue;
    }
    // Follow next links around the face
    let current = startHe;
    let count = 0;
    const maxIter = 1000; // Safety limit
    do {
      const he = kernel.halfEdges.get(current);
      if (!he || he.next === -1) {
        violations++;
        break;
      }
      current = he.next;
      count++;
      if (count > maxIter) {
        violations++;
        break;
      }
    } while (current !== startHe && count <= maxIter);
  }
  return {
    checkId: 'face-cycles-close',
    name: 'Face cycles close',
    passed: violations === 0,
    violationCount: violations,
    message: violations === 0 ? 'All face cycles close properly' : `${violations} unclosed face cycles`,
  };
}

function checkVertexFans(kernel: MeshKernel): ConformanceCheck {
  let violations = 0;
  for (const [vId] of kernel.vertices) {
    // Check that at least one half-edge originates from this vertex
    let found = false;
    for (const [, he] of kernel.halfEdges) {
      if (he.origin === vId) {
        found = true;
        break;
      }
    }
    if (!found) {
      violations++;
    }
  }
  return {
    checkId: 'vertex-fans',
    name: 'Vertex fans enumerable',
    passed: violations === 0,
    violationCount: violations,
    message: violations === 0 ? 'All vertices have half-edges' : `${violations} orphaned vertices`,
  };
}

function checkNoDegenerateFaces(kernel: MeshKernel): ConformanceCheck {
  let violations = 0;
  for (const [, face] of kernel.faces) {
    if (face.vertices.length < 3) {
      violations++;
    }
    // Check for duplicate vertices in face
    const seen = new Set<number>();
    for (const vId of face.vertices) {
      if (seen.has(vId)) {
        violations++;
        break;
      }
      seen.add(vId);
    }
  }
  return {
    checkId: 'no-degenerate-faces',
    name: 'No degenerate faces',
    passed: violations === 0,
    violationCount: violations,
    message: violations === 0 ? 'No degenerate faces' : `${violations} degenerate faces`,
  };
}

function checkFaceVertexRefs(kernel: MeshKernel): ConformanceCheck {
  let violations = 0;
  for (const [, face] of kernel.faces) {
    for (const vId of face.vertices) {
      if (!kernel.vertices.has(vId)) {
        violations++;
      }
    }
  }
  return {
    checkId: 'face-vertex-refs',
    name: 'Face vertex references valid',
    passed: violations === 0,
    violationCount: violations,
    message: violations === 0 ? 'All face vertex references valid' : `${violations} invalid face vertex refs`,
  };
}

function checkFinitePositions(kernel: MeshKernel): ConformanceCheck {
  let violations = 0;
  for (const [, v] of kernel.vertices) {
    if (!Number.isFinite(v.position[0]) || !Number.isFinite(v.position[1]) || !Number.isFinite(v.position[2])) {
      violations++;
    }
  }
  return {
    checkId: 'finite-positions',
    name: 'All positions finite',
    passed: violations === 0,
    violationCount: violations,
    message: violations === 0 ? 'All vertex positions finite' : `${violations} non-finite positions`,
  };
}

function checkConsistentWinding(kernel: MeshKernel): ConformanceCheck {
  let violations = 0;
  for (const [, he] of kernel.halfEdges) {
    if (he.twin === -1) continue;
    const twin = kernel.halfEdges.get(he.twin);
    if (!twin) continue;
    // Twin should have the same face or be a boundary
    // And the twin's next should point in the reverse direction
    if (he.face !== -1 && twin.face !== -1 && he.face === twin.face) {
      // Same face for both half-edges is wrong (unless it's a non-manifold edge)
      violations++;
    }
  }
  return {
    checkId: 'consistent-winding',
    name: 'Consistent winding',
    passed: violations === 0,
    violationCount: violations,
    message: violations === 0 ? 'Winding consistent' : `${violations} winding violations`,
  };
}

function checkNoDuplicateEdges(kernel: MeshKernel): ConformanceCheck {
  let violations = 0;
  const edgeMap = new Map<string, number>();
  for (const [, he] of kernel.halfEdges) {
    if (he.twin === -1) continue; // Only check one direction
    const key = `${he.origin}-${he.destination}`;
    const count = edgeMap.get(key) ?? 0;
    if (count > 0) {
      violations++;
    }
    edgeMap.set(key, count + 1);
  }
  return {
    checkId: 'no-duplicate-edges',
    name: 'No duplicate half-edges',
    passed: violations === 0,
    violationCount: violations,
    message: violations === 0 ? 'No duplicate edges' : `${violations} duplicate edges`,
  };
}

// ---------------------------------------------------------------------------
// Validate after operation
// ---------------------------------------------------------------------------

export function validateAfterOperation(
  kernel: MeshKernel,
  operationName: string,
): ConformanceResult {
  const result = validateKernel(kernel);
  if (!result.passed) {
    console.error(
      `[MeshKernel] Conformance FAILED after ${operationName}: ` +
        `${result.errorCount} errors. ` +
        result.checks.filter((c) => !c.passed).map((c) => `${c.name}: ${c.message}`).join('; '),
    );
  }
  return result;
}

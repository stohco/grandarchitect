/**
 * POST /api/architect/claims/approve
 *
 * Human approval workflow for claim records.
 * The AI CANNOT approve its own reconstructed claims — only a user
 * with actorType='user' can approve.
 *
 * Body: {
 *   claimId: string,
 *   decision: 'approved' | 'rejected' | 'needs-revision',
 *   actorId: string,
 *   comment?: string,
 *   revisions?: { truthLevel?, statement?, scope?, dependencies? }
 * }
 *
 * Returns the updated claim with approval record.
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';
import type { ClaimRegistry, ClaimRecord } from '@/engine/architect/rcvc/claims/schema';

export const runtime = 'nodejs';

const REGISTRY_PATH = join(process.cwd(), 'data', 'claims', 'registry.json');

interface ApprovalRequest {
  claimId: string;
  decision: 'approved' | 'rejected' | 'needs-revision';
  actorId: string;
  actorType?: 'user' | 'authorized-reviewer';
  comment?: string;
  revisions?: {
    truthLevel?: string;
    statement?: string;
    scope?: Record<string, unknown>;
    dependencies?: string[];
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: ApprovalRequest = await req.json();

    if (!body.claimId || !body.decision || !body.actorId) {
      return NextResponse.json(
        { error: 'Missing required fields: claimId, decision, actorId' },
        { status: 400 },
      );
    }

    // Load registry
    let registry: ClaimRegistry;
    try {
      const cached = await readFile(REGISTRY_PATH, 'utf-8');
      registry = JSON.parse(cached);
    } catch {
      return NextResponse.json(
        { error: 'Claim registry not found. Run the extractor first.' },
        { status: 404 },
      );
    }

    // Find the claim
    const claimIndex = registry.claims.findIndex(c => c.claimId === body.claimId);
    if (claimIndex === -1) {
      return NextResponse.json(
        { error: `Claim not found: ${body.claimId}` },
        { status: 404 },
      );
    }

    const claim = registry.claims[claimIndex];

    // CRITICAL: AI cannot self-approve
    // If the claim was script-inserted or inferred, only a user can approve it
    if (
      (claim.provenance === 'script-inserted' || claim.provenance === 'inferred') &&
      body.actorType !== 'user'
    ) {
      return NextResponse.json(
        {
          error: 'AI-generated claims cannot be self-approved. Only a user with actorType="user" can approve reconstructed claims.',
          claimId: body.claimId,
          claimProvenance: claim.provenance,
        },
        { status: 403 },
      );
    }

    // Compute claim hash at approval time
    const claimHash = createHash('sha256')
      .update(claim.claimId + claim.statement + JSON.stringify(claim.dependencies || []))
      .digest('hex');

    // Apply revisions if provided (needs-revision case)
    const updatedClaim: ClaimRecord = {
      ...claim,
      approvalStatus: body.decision === 'approved' ? 'approved'
        : body.decision === 'rejected' ? 'rejected'
        : 'candidate',
      reviewedAt: new Date().toISOString(),
      reviewNotes: body.comment,
    };

    if (body.revisions) {
      if (body.revisions.truthLevel) {
        updatedClaim.truthLevel = body.revisions.truthLevel as ClaimRecord['truthLevel'];
      }
      if (body.revisions.statement) {
        updatedClaim.statement = body.revisions.statement;
      }
      if (body.revisions.dependencies) {
        updatedClaim.dependencies = body.revisions.dependencies;
      }
    }

    // Create the approval record
    const approvalRecord = {
      decision: body.decision,
      actorId: body.actorId,
      actorType: body.actorType || 'user',
      timestamp: new Date().toISOString(),
      claimRevisionHash: claimHash,
      comment: body.comment,
    };

    // Store the approval record in the claim
    (updatedClaim as any).approvalRecord = approvalRecord;

    // Update the registry
    registry.claims[claimIndex] = updatedClaim;

    // Recompute summary
    const { computeSummary } = await import('@/engine/architect/rcvc/claims/schema');
    registry.summary = computeSummary(registry.claims);

    // Save
    await mkdir(join(process.cwd(), 'data', 'claims'), { recursive: true });
    await writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2));

    return NextResponse.json({
      ok: true,
      claimId: body.claimId,
      decision: body.decision,
      approvalRecord,
      updatedClaim,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/editor/capabilities
 *
 * Returns a static catalogue of Grand Architect capabilities — the tools
 * the architect agent can invoke against the world kernel. Mirrors
 * engine-architecture/43_GRAND_ARCHITECT_CONTROL_PLANE.md and
 * 44_ARCHITECT_TOOL_RESOURCE_PROTOCOL.md.
 */

import { NextResponse } from 'next/server';
import { CapabilityDescriptorLite } from '@/lib/editor/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CAPABILITIES: CapabilityDescriptorLite[] = [
  { capabilityId: 'world.query_state', description: 'Read the current world state for a region or entity', category: 'inspection' },
  { capabilityId: 'world.query_history', description: 'Query past ticks and events from the history log', category: 'inspection' },
  { capabilityId: 'world.fork', description: 'Create a temporary fork of the world for what-if exploration', category: 'branching' },
  { capabilityId: 'world.merge', description: 'Merge a temporary fork back into the main branch', category: 'branching' },
  { capabilityId: 'entity.spawn', description: 'Spawn a new entity of a given definition', category: 'mutation' },
  { capabilityId: 'entity.despawn', description: 'Remove an entity from the world', category: 'mutation' },
  { capabilityId: 'entity.transform', description: 'Move, rotate, or scale an existing entity', category: 'mutation' },
  { capabilityId: 'entity.set_metadata', description: 'Set metadata fields on an entity', category: 'mutation' },
  { capabilityId: 'narrative.inject_event', description: 'Inject a story event into the simulation', category: 'narrative' },
  { capabilityId: 'narrative.spawn_quest', description: 'Author and spawn a quest arc', category: 'narrative' },
  { capabilityId: 'weather.set_pattern', description: 'Override the weather pattern for a region', category: 'environment' },
  { capabilityId: 'economy.adjust_supply', description: 'Adjust a good\u2019s supply in the local market', category: 'economy' },
  { capabilityId: 'cultivation.grant_breakthrough', description: 'Grant a cultivation breakthrough to a cultivator', category: 'cultivation' },
  { capabilityId: 'time.advance_tick', description: 'Advance the world clock by one tick', category: 'time' },
  { capabilityId: 'time.set_rate', description: 'Set the simulation tick rate multiplier', category: 'time' },
];

export async function GET() {
  return NextResponse.json(
    { capabilities: CAPABILITIES, count: CAPABILITIES.length },
    {
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}

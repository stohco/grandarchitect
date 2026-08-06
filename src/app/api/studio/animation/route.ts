import { NextRequest, NextResponse } from 'next/server';
import { requireDevMode } from '@/lib/editor/api-guards';
import { createWalkCycle, evaluateClipAtTime, retargetAnimation, createEmptyAnimationSet, getAnimationSetStats } from '@/engine/studio/animation-studio';
import type { AnimationClip, RetargetMapping } from '@/engine/studio/animation-studio';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// In-memory clip store
const clips = new Map<string, AnimationClip>();

export async function GET() {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;

  return NextResponse.json({
    clips: Array.from(clips.keys()).map((id) => {
      const clip = clips.get(id)!;
      return {
        clipId: id,
        name: clip.name,
        duration: clip.duration,
        trackCount: clip.tracks.length,
        eventCount: clip.events.length,
        loop: clip.loop,
      };
    }),
    summary: {
      totalClips: clips.size,
      totalDuration: Array.from(clips.values()).reduce((s, c) => s + c.duration, 0),
    },
  });
}

export async function POST(req: NextRequest) {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;

  try {
    const body = await req.json();
    const { action, clipId, params } = body as {
      action: string;
      clipId?: string;
      params?: Record<string, unknown>;
    };

    switch (action) {
      case 'create_walk_cycle': {
        const id = clipId ?? 'ANM_WALK_01';
        const duration = (params?.duration as number) ?? 1.0;
        const fps = (params?.fps as number) ?? 30;
        const clip = createWalkCycle(id, duration, fps);
        clips.set(id, clip);
        return NextResponse.json({
          ok: true,
          clipId: id,
          name: clip.name,
          duration: clip.duration,
          trackCount: clip.tracks.length,
          keyframeCount: clip.tracks.reduce((s, t) => s + t.keyframes.length, 0),
          eventCount: clip.events.length,
          rootMotion: clip.rootMotion,
        });
      }

      case 'evaluate': {
        const clip = clips.get(clipId!);
        if (!clip) return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
        const time = (params?.time as number) ?? 0;
        const transforms = evaluateClipAtTime(clip, time);
        return NextResponse.json({
          ok: true,
          time,
          boneCount: transforms.size,
          bones: Array.from(transforms.entries()).map(([bone, t]) => ({
            bone,
            position: t.position,
            rotation: t.rotation,
            scale: t.scale,
          })),
        });
      }

      case 'retarget': {
        const clip = clips.get(clipId!);
        if (!clip) return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
        const mappings = (params?.mappings as RetargetMapping[]) ?? [];
        const { retargetedClip, result } = retargetAnimation(clip, mappings);
        clips.set(retargetedClip.clipId, retargetedClip);
        return NextResponse.json({
          ok: result.success,
          retargetedClipId: retargetedClip.clipId,
          result,
        });
      }

      case 'create_set': {
        const characterId = clipId ?? 'CHR_PLAYER_01';
        const set = createEmptyAnimationSet(characterId);
        // Add a walk cycle to locomotion
        const walk = createWalkCycle('ANM_WALK_01', 1.0, 30);
        set.locomotion.push(walk);
        const stats = getAnimationSetStats(set);
        return NextResponse.json({
          ok: true,
          characterId,
          stats,
          categories: Object.keys(set).filter((k) => k !== 'characterId'),
        });
      }

      case 'stats': {
        const clip = clips.get(clipId!);
        if (!clip) return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
        return NextResponse.json({
          ok: true,
          clipId,
          name: clip.name,
          duration: clip.duration,
          tracks: clip.tracks.map((t) => ({
            trackId: t.trackId,
            targetBone: t.targetBone,
            targetType: t.targetType,
            keyframeCount: t.keyframes.length,
            enabled: t.enabled,
          })),
          events: clip.events,
          rootMotion: clip.rootMotion,
          tags: clip.tags,
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid request' },
      { status: 400 },
    );
  }
}

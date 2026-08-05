import { NextRequest, NextResponse } from 'next/server';
import { createOperationGraphManager } from '@/engine/frontier/operation-graph';
export const runtime = 'nodejs';

// Singleton manager for the operation graph system
const manager = createOperationGraphManager();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'list') {
      return NextResponse.json({ graphs: manager.list() });
    }

    if (action === 'get' && searchParams.get('graphId')) {
      const graph = manager.get(searchParams.get('graphId')!);
      if (!graph) return NextResponse.json({ error: 'Graph not found' }, { status: 404 });
      return NextResponse.json(graph);
    }

    if (action === 'history' && searchParams.get('graphId')) {
      return NextResponse.json({ history: manager.getHistory(searchParams.get('graphId')!) });
    }

    // Default: return list
    return NextResponse.json({ graphs: manager.list() });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'create') {
      const graph = manager.create(body.graphType);
      return NextResponse.json({ ok: true, graph });
    }

    if (action === 'addOperation') {
      const opId = manager.addOperation(body.graphId, {
        type: body.type,
        label: body.label,
        parameters: body.parameters || {},
        enabled: body.enabled !== false,
        attributableTo: body.attributableTo || 'user',
      });
      return NextResponse.json({ ok: true, operationId: opId });
    }

    if (action === 'toggleOperation') {
      const result = manager.toggleOperation(body.graphId, body.operationId);
      return NextResponse.json({ ok: result });
    }

    if (action === 'removeOperation') {
      const result = manager.removeOperation(body.graphId, body.operationId);
      return NextResponse.json({ ok: result });
    }

    if (action === 'reorderOperation') {
      const result = manager.reorderOperation(body.graphId, body.operationId, body.newIndex);
      return NextResponse.json({ ok: result });
    }

    if (action === 'updateParameters') {
      const result = manager.updateParameters(body.graphId, body.operationId, body.parameters);
      return NextResponse.json({ ok: result });
    }

    if (action === 'undo') {
      const opId = manager.undo(body.graphId);
      return NextResponse.json({ ok: true, undoneOperationId: opId });
    }

    if (action === 'redo') {
      const opId = manager.redo(body.graphId);
      return NextResponse.json({ ok: true, redoneOperationId: opId });
    }

    if (action === 'bake') {
      const result = manager.bake(body.graphId);
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}

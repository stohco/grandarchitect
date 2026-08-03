/**
 * Architect Control Plane Conformance Test
 *
 * Proves that the Phase 2 architect system works end-to-end:
 * 1. Tool registry: register, list, describe, dispatch
 * 2. Permission system: roles, autonomy levels, capability tokens
 * 3. Audit trail: append, query, chain verification
 * 4. Capability graph: upsert, gap analysis, topological sort
 * 5. Decision ledger: record, search, status update
 * 6. World Oracle: search, explain, engine summary
 * 7. Gateway: authenticate, authorize, dispatch commands
 */

import { createToolRegistry } from './tool-protocol';
import type { ToolRegistrationInput } from './tool-protocol';
import { createPermissionSystem } from './permissions';
import { createAuditTrail } from './audit';
import { createCapabilityGraph } from './capability-graph';
import { createDecisionLedger } from './decision-ledger';
import { createWorldOracle } from './world-oracle';
import { createArchitectGateway } from './gateway';
import { autonomyRank, autonomyGte, AUTONOMY_ORDER } from './types';
import type { AutonomyLevel, CommandRequest } from './types';

// Test runner
let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.error(`  ❌ ${message}`);
  }
}

async function runTests() {
  console.log('=== Architect Control Plane Conformance Test ===\n');

  // ============================================================
  // Test 1: Tool Registry
  // ============================================================
  console.log('Test 1: Tool Registry');

  const registry = createToolRegistry();

  // Register a simple inspection tool
  const pingRegistration: ToolRegistrationInput = {
    name: 'engine.ping',
    description: 'Ping the engine and get its version.',
    category: 'Inspection',
    inputSchema: { type: 'object', properties: {}, description: 'No input' },
    outputSchema: { type: 'object', properties: { version: { type: 'string' }, tick: { type: 'number' } } },
    requiresPermissions: [],
    requiresAutonomy: 'Observe',
    mutatesState: false,
    maxWallClockMs: 1000,
    maxMemoryMiB: 1,
    longRunning: false,
    registeredBy: 'ga:architect',
    handler: async (_params, ctx) => {
      return { ok: true as const, data: { version: '0.2.0', tick: ctx.tick } };
    },
  };

  let err = registry.register(pingRegistration);
  assert(err === undefined, 'Ping tool registered without error');
  assert(registry.has('engine.ping'), 'Ping tool exists in registry');

  // Register a mutating tool
  const stateMutationReg: ToolRegistrationInput = {
    name: 'definition.patch',
    description: 'Patch a definition.',
    category: 'ControlledEditing',
    inputSchema: { type: 'object', properties: { id: { type: 'string' }, patch: { type: 'object', properties: {} } }, required: ['id'] },
    outputSchema: { type: 'object', properties: { success: { type: 'boolean' } } },
    requiresPermissions: ['write-state'],
    requiresAutonomy: 'Sandbox',
    mutatesState: true,
    maxWallClockMs: 5000,
    maxMemoryMiB: 10,
    longRunning: false,
    registeredBy: 'ga:content-schema',
    handler: async (params) => {
      return { ok: true as const, data: { success: true, patched: (params as any).id } };
    },
  };

  err = registry.register(stateMutationReg);
  assert(err === undefined, 'definition.patch tool registered');

  // List tools
  const allTools = registry.list();
  assert(allTools.length === 2, 'Two tools listed');

  // Describe a tool
  const pingDesc = registry.describe('engine.ping');
  assert(pingDesc !== undefined, 'Ping tool described');
  assert(pingDesc!.category === 'Inspection', 'Ping tool is Inspection category');
  assert(pingDesc!.requiresAutonomy === 'Observe', 'Ping tool requires Observe autonomy');
  assert(pingDesc!.mutatesState === false, 'Ping tool does not mutate state');

  // Filter by category
  const inspectionTools = registry.list({ category: 'Inspection' });
  assert(inspectionTools.length === 1, 'One inspection tool');
  assert(inspectionTools[0].name === 'engine.ping', 'It is engine.ping');

  // Filter by prefix
  const engineTools = registry.list({ prefix: 'engine.' });
  assert(engineTools.length === 1, 'One engine.* tool');

  // Filter by autonomy level
  const sandboxTools = registry.list({ requiresAutonomy: 'Sandbox' });
  assert(sandboxTools.length === 2, 'Both tools usable at Sandbox level');

  // Dispatch a tool
  const result = await registry.dispatch('engine.ping', {}, { sessionId: 'test', principalId: 'test-agent', role: 'Architect', autonomy: 'Observe', tick: 42 });
  assert(result.ok, 'Ping dispatch succeeded');
  assert((result as any).data.version === '0.2.0', 'Ping returned version 0.2.0');
  assert((result as any).data.tick === 42, 'Ping returned tick 42');

  // Dispatch unknown tool
  const unknownResult = await registry.dispatch('unknown.tool', {}, { sessionId: 'test', principalId: 'test', role: 'Architect', autonomy: 'Observe', tick: 0 });
  assert(!unknownResult.ok, 'Unknown tool dispatch fails');
  assert(unknownResult.error.code === 'ToolNotFound', 'Error code is ToolNotFound');

  // Unregister
  const unregistered = registry.unregister('engine.ping');
  assert(unregistered, 'Ping tool unregistered');
  assert(!registry.has('engine.ping'), 'Ping tool no longer in registry');

  // Re-register for later tests
  registry.register(pingRegistration);

  // ============================================================
  // Test 2: Permission System
  // ============================================================
  console.log('\nTest 2: Permission System');

  const perms = createPermissionSystem();

  // Role profiles exist
  const architectRole = perms.getRoleProfile('Architect');
  assert(architectRole !== undefined, 'Architect role profile exists');
  assert(architectRole!.autonomyCeiling === 'Branch', 'Architect ceiling is Branch');
  assert(architectRole!.mayEscalate === true, 'Architect may escalate');

  const reviewerRole = perms.getRoleProfile('Reviewer');
  assert(reviewerRole !== undefined, 'Reviewer role profile exists');
  assert(reviewerRole!.mayEscalate === false, 'Reviewer may not escalate');

  const implRole = perms.getRoleProfile('Implementer');
  assert(implRole !== undefined, 'Implementer role profile exists');
  assert(implRole!.requiresReview === true, 'Implementer requires review');

  // Autonomy ordering
  assert(autonomyRank('Observe') === 1, 'Observe is rank 1');
  assert(autonomyRank('Release') === 7, 'Release is rank 7');
  assert(autonomyGte('Sandbox', 'Observe'), 'Sandbox >= Observe');
  assert(autonomyGte('Release', 'Observe'), 'Release >= Observe');
  assert(!autonomyGte('Observe', 'Sandbox'), 'NOT Observe >= Sandbox');
  assert(AUTONOMY_ORDER.length === 7, 'Seven autonomy levels');

  // Authorization: role not allowed
  const reviewerSession: any = {
    sessionId: 'test-1',
    principalId: 'reviewer-agent',
    role: 'Reviewer',
    autonomy: 'Preview',
  };

  let authResult = perms.authorize(reviewerSession, 'definition.patch', 'Sandbox');
  assert(!authResult.allowed, 'Reviewer cannot call definition.patch');
  assert(authResult.reason.kind === 'RoleNotAllowed', 'Reason is RoleNotAllowed');

  // Authorization: autonomy exceeded
  const implSession: any = {
    sessionId: 'test-2',
    principalId: 'impl-agent',
    role: 'Implementer',
    autonomy: 'Observe',
  };

  authResult = perms.authorize(implSession, 'definition.patch', 'Sandbox');
  assert(!authResult.allowed, 'Implementer at Observe cannot call Sandbox tool');
  assert(authResult.reason.kind === 'AutonomyExceeded', 'Reason is AutonomyExceeded');

  // Authorization: success
  const implSessionSandbox: any = {
    sessionId: 'test-3',
    principalId: 'impl-agent',
    role: 'Implementer',
    autonomy: 'Sandbox',
  };

  authResult = perms.authorize(implSessionSandbox, 'definition.patch', 'Sandbox');
  assert(authResult.allowed, 'Implementer at Sandbox can call definition.patch');

  // Capability tokens
  const token = perms.issueCapabilityToken({
    sessionId: 'test-3',
    tool: 'definition.patch',
    maxAutonomy: 'Sandbox',
    singleUse: true,
    ttlMs: 60000,
    grantedBy: 'architect',
  });
  assert(token.length === 64, 'Token is 64 hex chars');

  assert(perms.consumeToken(token, 'definition.patch', 'test-3'), 'Token consumed successfully');
  assert(!perms.consumeToken(token, 'definition.patch', 'test-3'), 'Single-use token rejected on second use');

  // Token for wrong session
  const token2 = perms.issueCapabilityToken({
    sessionId: 'test-3',
    tool: 'definition.patch',
    maxAutonomy: 'Sandbox',
    singleUse: false,
    ttlMs: 60000,
    grantedBy: 'architect',
  });
  assert(!perms.consumeToken(token2, 'definition.patch', 'wrong-session'), 'Token rejected for wrong session');
  assert(!perms.consumeToken(token2, 'other.tool', 'test-3'), 'Token rejected for wrong tool');
  assert(perms.consumeToken(token2, 'definition.patch', 'test-3'), 'Multi-use token works');
  assert(perms.consumeToken(token2, 'definition.patch', 'test-3'), 'Multi-use token works again');

  // Hard-gated actions
  assert(perms.requiresHumanApproval('world.delete', 'Release'), 'world.delete requires human approval');
  assert(perms.requiresHumanApproval('permissions.change', 'Release'), 'permissions.change requires human approval');
  assert(!perms.requiresHumanApproval('engine.ping', 'Observe'), 'engine.ping does not require human approval');

  // ============================================================
  // Test 3: Audit Trail
  // ============================================================
  console.log('\nTest 3: Audit Trail');

  const audit = createAuditTrail();

  assert(audit.size() === 0, 'Audit trail starts empty');

  const record1 = audit.append({
    agent: { principalId: 'architect-agent', role: 'Architect' },
    human: { principalId: 'human-1' },
    tool: 'engine.ping',
    args: {},
    reason: 'health check',
    result: { status: 'ok', summary: 'pong' },
    capabilityTokenHash: 'none',
    autonomy: 'Observe',
  });

  assert(audit.size() === 1, 'One audit record after append');
  assert(record1.recordId.startsWith('audit-'), 'Record ID starts with audit-');
  assert(record1.contentHash.length === 64, 'Content hash is 64 hex chars');
  assert(record1.previousHash.length === 64, 'Previous hash is 64 hex chars');
  assert(record1.tool === 'engine.ping', 'Tool recorded correctly');
  assert(record1.result.status === 'ok', 'Result status recorded correctly');

  // Chain integrity
  assert(audit.getLatestHash().length === 64, 'Latest hash is 64 hex chars');
  assert(audit.verifyChain(), 'Chain integrity verified');

  // Query audit
  const byTool = audit.query({ tool: 'engine.ping' });
  assert(byTool.length === 1, 'One record for engine.ping');

  const byStatus = audit.query({ resultStatus: 'error' });
  assert(byStatus.length === 0, 'No error records');

  // Append more records and verify chain
  audit.append({
    agent: { principalId: 'impl-agent', role: 'Implementer' },
    human: { principalId: 'human-1' },
    tool: 'definition.patch',
    args: { id: 'test-def' },
    reason: 'add test definition',
    result: { status: 'ok', summary: 'patched' },
    capabilityTokenHash: 'abc123',
    autonomy: 'Sandbox',
  });

  assert(audit.size() === 2, 'Two audit records');
  assert(audit.verifyChain(), 'Chain still intact after 2 records');

  // Query by agent
  const byAgent = audit.query({ agent: 'architect-agent' });
  assert(byAgent.length === 1, 'One record by architect-agent');

  // ============================================================
  // Test 4: Capability Graph
  // ============================================================
  console.log('\nTest 4: Capability Graph');

  const capGraph = createCapabilityGraph();

  assert(capGraph.size() === 0, 'Graph starts empty');

  // Add requirements with dependencies
  capGraph.upsert({
    id: 'engine.kernel',
    description: 'The engine kernel (plugin host, capabilities, events, scheduler)',
    requiredBy: ['phase-1', 'all-plugins'],
    dependsOn: [],
    acceptanceTests: ['kernel-conformance'],
    implementationState: 'implemented',
    evidence: ['conformance-test-37-37'],
    knownDefects: [],
    owningPlugin: 'ga:kernel',
    addedAt: '2026-08-03',
    addedBy: 'grand-architect',
  });

  capGraph.upsert({
    id: 'engine.architect',
    description: 'The Grand Architect Control Plane',
    requiredBy: ['phase-2', 'self-improvement'],
    dependsOn: ['engine.kernel'],
    acceptanceTests: ['architect-conformance'],
    implementationState: 'in-progress',
    evidence: [],
    knownDefects: [],
    addedAt: '2026-08-04',
    addedBy: 'grand-architect',
  });

  capGraph.upsert({
    id: 'engine.render.webgpu',
    description: 'WebGPU rendering backend',
    requiredBy: ['phase-3', 'vertical-slice'],
    dependsOn: ['engine.kernel', 'engine.render.abstract'],
    acceptanceTests: ['render-conformance'],
    implementationState: 'not-started',
    evidence: [],
    knownDefects: [],
    addedAt: '2026-08-03',
    addedBy: 'grand-architect',
  });

  assert(capGraph.size() === 3, 'Three requirements in graph');
  assert(capGraph.has('engine.kernel'), 'engine.kernel exists');
  assert(capGraph.get('engine.kernel')!.implementationState === 'implemented', 'engine.kernel is implemented');

  // Topological order
  const topo = capGraph.topologicalOrder();
  assert(topo.length === 3, 'Topological order has 3 items');
  assert(topo[0] === 'engine.kernel', 'engine.kernel is first (no deps)');

  // Roots and leaves
  const roots = capGraph.roots();
  assert(roots.includes('engine.kernel'), 'engine.kernel is a root');
  const leaves = capGraph.leaves();
  assert(leaves.includes('engine.architect'), 'engine.architect is a leaf');

  // Gap analysis
  const gap = capGraph.computeGap();
  assert(gap.length === 2, 'Two gaps (architect in-progress, render not-started)');
  assert(gap[0].requirementId === 'engine.architect' || gap[1].requirementId === 'engine.architect', 'Architect is in the gap');
  assert(gap.some(g => g.requirementId === 'engine.render.webgpu'), 'Render WebGPU is in the gap');

  // Remove
  assert(capGraph.remove('engine.render.webgpu'), 'Removed render.webgpu');
  assert(capGraph.size() === 2, 'Two requirements after removal');

  // ============================================================
  // Test 5: Decision Ledger
  // ============================================================
  console.log('\nTest 5: Decision Ledger');

  const ledger = createDecisionLedger();

  assert(ledger.size() === 0, 'Ledger starts empty');

  ledger.record({
    decisionId: 'decision:kernel.plugin-host',
    problem: 'How should the engine manage plugins?',
    context: 'Phase 1: building the kernel',
    selectedApproach: 'In-process plugin host with capability registry',
    why: 'Simplest implementation that supports the full plugin lifecycle. Everything is a plugin, including core systems.',
    knownDrawbacks: ['No hot-reload yet', 'Single-threaded for now'],
    affectedSystems: ['engine.kernel', 'ga:determinism'],
    reconsiderationTriggers: ['Performance benchmarks exceed budget', 'Need hot-reload for editor workflow'],
    date: '2026-08-03',
    engineVersion: '0.1.0',
    deciders: [{ role: 'human', principalId: 'operator' }],
    status: 'active',
    capabilityRefs: ['engine.kernel'],
    relatedDecisions: [],
  });

  assert(ledger.size() === 1, 'One decision recorded');
  assert(ledger.get('decision:kernel.plugin-host')!.status === 'active', 'Decision is active');

  // Search
  const searchResults = ledger.search({ keyword: 'plugin' });
  assert(searchResults.length === 1, 'One result for keyword plugin');

  const searchBySystem = ledger.search({ affectedSystem: 'engine.kernel' });
  assert(searchBySystem.length === 1, 'One result for affected system engine.kernel');

  // Status update
  assert(ledger.updateStatus('decision:kernel.plugin-host', 'superseded', 'decision:v2.plugin-host'), 'Decision superseded');
  assert(ledger.get('decision:kernel.plugin-host')!.status === 'superseded', 'Status is now superseded');
  assert(ledger.get('decision:kernel.plugin-host')!.supersededBy === 'decision:v2.plugin-host', 'Superseded by recorded');

  // ============================================================
  // Test 6: World Oracle
  // ============================================================
  console.log('\nTest 6: World Oracle');

  // Rebuild graph with the removed item added back
  capGraph.upsert({
    id: 'engine.render.webgpu',
    description: 'WebGPU rendering backend',
    requiredBy: ['phase-3', 'vertical-slice'],
    dependsOn: ['engine.kernel', 'engine.render.abstract'],
    acceptanceTests: ['render-conformance'],
    implementationState: 'not-started',
    evidence: [],
    knownDefects: [],
    addedAt: '2026-08-03',
    addedBy: 'grand-architect',
  });

  const oracle = createWorldOracle(capGraph, ledger, audit);

  // Engine summary
  const summary = oracle.getEngineSummary();
  assert(summary.totalCapabilities === 3, 'Summary: 3 total capabilities');
  assert(summary.implementedCapabilities === 1, 'Summary: 1 implemented');
  assert(summary.totalDecisions === 1, 'Summary: 1 decision');
  assert(summary.activeDecisions === 0, 'Summary: 0 active decisions');
  assert(summary.currentGap === 2, 'Summary: 2 gaps');
  assert(summary.auditRecordCount === 2, 'Summary: 2 audit records');

  // Gap query
  const gapResult = oracle.getGap();
  assert(gapResult.length === 2, 'Oracle gap has 2 items');

  // Search
  const searchResult = oracle.search({ text: 'kernel' });
  assert(searchResult.totalMatches >= 1, 'Search for kernel returns matches');

  // Explain
  const explanation = oracle.explain('engine.kernel');
  assert(explanation.target === 'engine.kernel', 'Explain target is correct');
  assert(explanation.decisions.length >= 0, 'Explain returns decisions array');
  assert(explanation.capabilities.length >= 0, 'Explain returns capabilities array');

  // ============================================================
  // Test 7: Architect Gateway (end-to-end)
  // ============================================================
  console.log('\nTest 7: Architect Gateway (end-to-end)');

  const tools2 = createToolRegistry();
  tools2.register({
    name: 'engine.describe',
    description: 'List available tools.',
    category: 'Inspection',
    inputSchema: { type: 'object', properties: {}, description: 'No input' },
    outputSchema: { type: 'object', properties: { tools: { type: 'array', items: { type: 'string' } } } },
    requiresPermissions: [],
    requiresAutonomy: 'Observe',
    mutatesState: false,
    maxWallClockMs: 1000,
    maxMemoryMiB: 1,
    longRunning: false,
    registeredBy: 'ga:architect',
    handler: async (_params, _ctx) => {
      return { ok: true as const, data: { tools: ['engine.describe', 'engine.ping'] } };
    },
  });

  tools2.register(pingRegistration);
  tools2.register(stateMutationReg);

  const perms2 = createPermissionSystem();
  const audit2 = createAuditTrail();
  const capGraph2 = createCapabilityGraph();
  const ledger2 = createDecisionLedger();
  const oracle2 = createWorldOracle(capGraph2, ledger2, audit2);

  const gateway = createArchitectGateway({
    tools: tools2,
    permissions: perms2,
    audit: audit2,
    oracle: oracle2,
    capabilities: capGraph2,
    decisions: ledger2,
    getTick: () => 42,
  });

  // Authenticate
  const session = gateway.authenticate({
    principalId: 'test-architect',
    role: 'Architect',
    autonomy: 'Branch',
    humanAuthorization: { humanId: 'human-1' },
  });

  assert(session.sessionId.startsWith('session-'), 'Session ID has correct prefix');
  assert(session.role === 'Architect', 'Session role is Architect');
  assert(session.autonomy === 'Branch', 'Session autonomy is Branch');
  assert(gateway.isSessionValid(session.sessionId), 'Session is valid');

  // Get session
  const retrieved = gateway.getSession(session.sessionId);
  assert(retrieved !== undefined, 'Session retrieved by ID');
  assert(retrieved!.principalId === 'test-architect', 'Session principal is correct');

  // Authorize a valid call
  const req: CommandRequest = {
    requestId: 'req-1',
    sessionId: session.sessionId,
    tool: 'engine.ping',
    args: {},
    assertedAutonomy: 'Observe',
    capabilityToken: '',
    deadlineMs: 5000,
  };

  let authOutcome = gateway.authorize(req);
  assert(authOutcome.allowed, 'Authorization succeeds for engine.ping at Observe');

  // Dispatch (authorize + execute)
  const response = await gateway.dispatch(req);
  assert(response.requestId === 'req-1', 'Response has correct request ID');
  assert(response.status === 'ok', 'Dispatch succeeded');
  assert(response.audit !== undefined, 'Response has audit record');
  assert(response.audit.tool === 'engine.ping', 'Audit record has correct tool');
  assert(response.audit.agent.principalId === 'test-architect', 'Audit record has correct agent');
  assert(response.audit.result.status === 'ok', 'Audit record has ok status');

  // Verify audit trail has the record
  assert(audit2.size() === 1, 'Audit trail has 1 record after dispatch');
  assert(audit2.verifyChain(), 'Audit chain intact after dispatch');

  // Authorize a denied call (wrong role)
  const reviewerSess = gateway.authenticate({
    principalId: 'test-reviewer',
    role: 'Reviewer',
    autonomy: 'Preview',
    humanAuthorization: { humanId: 'human-1' },
  });

  const deniedReq: CommandRequest = {
    requestId: 'req-2',
    sessionId: reviewerSess.sessionId,
    tool: 'definition.patch',
    args: {},
    assertedAutonomy: 'Preview',
    capabilityToken: '',
    deadlineMs: 5000,
  };

  authOutcome = gateway.authorize(deniedReq);
  assert(!authOutcome.allowed, 'Authorization denied for Reviewer calling definition.patch');
  assert(authOutcome.code === 'RoleNotAllowed', 'Denial code is RoleNotAllowed');

  // Dispatch denied call also logs audit
  const deniedResponse = await gateway.dispatch(deniedReq);
  assert(deniedResponse.status === 'error', 'Denied dispatch returns error status');
  assert(audit2.size() === 2, 'Audit trail has 2 records (including denied call)');

  // Query audit through gateway
  const auditRecords = gateway.queryAudit({ tool: 'engine.ping' });
  assert(auditRecords.length === 1, 'One audit record for engine.ping');

  // ============================================================
  // Summary
  // ============================================================
  console.log('\n=== Results ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : `\n❌ ${failed} TESTS FAILED`);

  return failed === 0;
}

// Run
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(e => {
  console.error('Test runner crashed:', e);
  process.exit(1);
});

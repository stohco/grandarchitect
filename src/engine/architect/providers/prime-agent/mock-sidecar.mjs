/**
 * Mock Prime Agent sidecar — a faithful emitter of the documented JSONL
 * RPC protocol, used by prime-agent-conformance.ts to exercise the client
 * end-to-end WITHOUT a real prime-agent binary or LLM credentials.
 *
 * Runs as: node mock-sidecar.mjs <ignored-args...>
 * Speaks: session header on start; responses for get_state, get_commands,
 * prompt, get_last_assistant_text; agent events for a completed turn.
 */

import { readFileSync } from 'node:fs';
import { StringDecoder } from 'node:string_decoder';

const decoder = new StringDecoder('utf8');
let buffer = '';

process.stdout.write(JSON.stringify({
  type: 'session', version: 3, id: 'mock-session-1',
  timestamp: new Date().toISOString(), cwd: process.cwd(),
}) + '\n');

function send(cmd) {
  const id = cmd.id;
  const data = { id, type: 'response', command: cmd.type, success: true };
  switch (cmd.type) {
    case 'get_state':
      data.data = {
        model: null, thinkingLevel: 'medium', isStreaming: false,
        isCompacting: false, sessionFile: '/mock/session.jsonl',
        sessionId: 'mock-session-1', messageCount: 1,
        autoCompactionEnabled: true,
      };
      break;
    case 'get_commands':
      data.data = {
        commands: [
          { name: 'skill:mock-search', description: 'Mock search skill', source: 'skill', location: 'user' },
          { name: 'fix-tests', description: 'Fix failing tests', source: 'prompt', location: 'project' },
        ],
      };
      break;
    case 'get_last_assistant_text':
      data.data = { text: 'Hello from the mock sidecar.' };
      break;
    case 'get_messages':
      data.data = { messages: [] };
      break;
    case 'prompt': {
      // Emit a complete turn, then respond to the prompt command.
      setTimeout(() => {
        for (const ev of [
          { type: 'agent_start' },
          { type: 'turn_start' },
          { type: 'message_start', message: { role: 'assistant', content: [] } },
          {
            type: 'message_update',
            message: { role: 'assistant', content: [] },
            assistantMessageEvent: { type: 'text_delta', contentIndex: 0, delta: 'Hello from the mock sidecar.' },
          },
          { type: 'message_end', message: { role: 'assistant', content: [{ type: 'text', text: 'Hello from the mock sidecar.' }] } },
          { type: 'turn_end', message: { role: 'assistant', content: [] }, toolResults: [] },
          { type: 'agent_end', messages: [] },
        ]) {
          process.stdout.write(JSON.stringify(ev) + '\n');
        }
      }, 30);
      break;
    }
    default:
      data.data = {};
  }
  process.stdout.write(JSON.stringify(data) + '\n');
}

process.stdin.on('data', (chunk) => {
  buffer += decoder.write(chunk);
  while (true) {
    const nl = buffer.indexOf('\n');
    if (nl === -1) break;
    const line = buffer.slice(0, nl);
    buffer = buffer.slice(nl + 1);
    if (!line.trim()) continue;
    let cmd;
    try { cmd = JSON.parse(line); } catch { continue; }
    send(cmd);
  }
});
process.stdin.on('end', () => {
  buffer += decoder.end();
});

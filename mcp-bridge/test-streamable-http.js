#!/usr/bin/env node
/**
 * Script de test pour le serveur MCP Streamable HTTP
 */

const http = require('http');

const API_URL = process.env.MCP_API_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN || 'pat_5203_aGfXuKTDNVIYUrK94kO9Avu3Kh5yN-x-';

console.log('Test MCP Streamable HTTP Transport');
console.log(`URL: ${API_URL}/mcp`);
console.log('');

let sessionId = null;

// Helper pour envoyer une requête
function sendRequest(method, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_URL}/mcp`);
    const postData = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method: method,
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      }
    };

    if (sessionId) {
      options.headers['mcp-session-id'] = sessionId;
    }

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      // Capture session ID from headers
      const newSessionId = res.headers['mcp-session-id'];
      if (newSessionId && !sessionId) {
        sessionId = newSessionId;
        console.log(`Session ID: ${sessionId}`);
      }

      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

// Parse SSE response
function parseSSEResponse(body) {
  const lines = body.split('\n');
  const results = [];
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        results.push(JSON.parse(line.substring(6)));
      } catch (e) {
        // Not JSON
      }
    }
  }
  return results;
}

async function run() {
  try {
    // 1. Initialize
    console.log('1. Initialize...');
    const initRes = await sendRequest('POST', {
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      },
      id: 1
    });

    const initData = parseSSEResponse(initRes.body);
    if (initData[0]?.result) {
      console.log(`   Server: ${initData[0].result.serverInfo.name} v${initData[0].result.serverInfo.version}`);
    } else {
      console.log('   Response:', initRes.body);
    }

    // 2. Initialized notification
    console.log('2. Initialized notification...');
    const initedRes = await sendRequest('POST', {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {}
    });
    console.log(`   Status: ${initedRes.status}`);

    // 3. tools/list
    console.log('3. tools/list...');
    const toolsRes = await sendRequest('POST', {
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
      id: 2
    });

    const toolsData = parseSSEResponse(toolsRes.body);
    if (toolsData[0]?.result?.tools) {
      console.log(`   ${toolsData[0].result.tools.length} outils disponibles:`);
      toolsData[0].result.tools.forEach(t => console.log(`   - ${t.name}`));
    } else {
      console.log('   Response:', toolsRes.body);
    }

    // 4. tasks_list
    console.log('4. tasks_list...');
    const tasksRes = await sendRequest('POST', {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'tasks_list',
        arguments: {}
      },
      id: 3
    });

    const tasksData = parseSSEResponse(tasksRes.body);
    if (tasksData[0]?.result?.content) {
      try {
        const content = JSON.parse(tasksData[0].result.content[0].text);
        console.log(`   ${content.total} taches trouvees`);
      } catch (e) {
        console.log('   Response:', tasksRes.body);
      }
    } else {
      console.log('   Response:', tasksRes.body);
    }

    console.log('\nTests termines!');

  } catch (error) {
    console.error('Erreur:', error.message);
  }
}

run();

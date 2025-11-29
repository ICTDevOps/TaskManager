#!/usr/bin/env node
/**
 * Script de test pour le serveur MCP SSE
 */

const http = require('http');

const API_URL = process.env.MCP_API_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN || 'pat_5203_aGfXuKTDNVIYUrK94kO9Avu3Kh5yN-x-';

console.log('🔌 Connexion au serveur MCP SSE...');
console.log(`   URL: ${API_URL}/mcp/sse`);

// Parse URL
const url = new URL(`${API_URL}/mcp/sse`);

const options = {
  hostname: url.hostname,
  port: url.port || 80,
  path: url.pathname,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Accept': 'text/event-stream',
    'Cache-Control': 'no-cache'
  }
};

const req = http.request(options, (res) => {
  console.log(`✅ Connexion établie (status: ${res.statusCode})`);

  let sessionId = null;
  let buffer = '';

  res.on('data', (chunk) => {
    buffer += chunk.toString();

    // Parse SSE events
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.substring(6);
        console.log(`📨 SSE data: ${data}`);

        // Extract sessionId
        const match = data.match(/sessionId=([a-f0-9-]+)/);
        if (match) {
          sessionId = match[1];
          console.log(`🔑 Session ID: ${sessionId}`);

          // Test tools/list après avoir obtenu le sessionId
          setTimeout(() => testToolsList(sessionId), 500);
        }
      } else if (line.startsWith('event: ')) {
        console.log(`📨 SSE event: ${line.substring(7)}`);
      }
    }
  });

  res.on('end', () => {
    console.log('❌ Connexion SSE fermée');
  });
});

req.on('error', (e) => {
  console.error(`❌ Erreur: ${e.message}`);
});

req.end();

// Test tools/list
function testToolsList(sessionId) {
  console.log('\n📤 Test: tools/list...');

  const postUrl = new URL(`${API_URL}/mcp/messages?sessionId=${sessionId}`);
  const postData = JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/list',
    params: {},
    id: 1
  });

  const postOptions = {
    hostname: postUrl.hostname,
    port: postUrl.port || 80,
    path: postUrl.pathname + postUrl.search,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const postReq = http.request(postOptions, (res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      console.log(`📥 Réponse (${res.statusCode}):`);
      try {
        const json = JSON.parse(body);
        if (json.result && json.result.tools) {
          console.log(`✅ ${json.result.tools.length} outils disponibles:`);
          json.result.tools.forEach(t => console.log(`   - ${t.name}`));
        } else {
          console.log(JSON.stringify(json, null, 2));
        }
      } catch (e) {
        console.log(body);
      }

      // Test tasks_list
      setTimeout(() => testTasksList(sessionId), 500);
    });
  });

  postReq.on('error', (e) => {
    console.error(`❌ Erreur POST: ${e.message}`);
  });

  postReq.write(postData);
  postReq.end();
}

// Test tasks_list
function testTasksList(sessionId) {
  console.log('\n📤 Test: tasks_list...');

  const postUrl = new URL(`${API_URL}/mcp/messages?sessionId=${sessionId}`);
  const postData = JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'tasks_list',
      arguments: {}
    },
    id: 2
  });

  const postOptions = {
    hostname: postUrl.hostname,
    port: postUrl.port || 80,
    path: postUrl.pathname + postUrl.search,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const postReq = http.request(postOptions, (res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      console.log(`📥 Réponse (${res.statusCode}):`);
      try {
        const json = JSON.parse(body);
        if (json.result && json.result.content) {
          const content = JSON.parse(json.result.content[0].text);
          console.log(`✅ ${content.total} tâches trouvées`);
        } else {
          console.log(JSON.stringify(json, null, 2));
        }
      } catch (e) {
        console.log(body);
      }

      console.log('\n✅ Tests terminés. Fermeture...');
      process.exit(0);
    });
  });

  postReq.on('error', (e) => {
    console.error(`❌ Erreur POST: ${e.message}`);
  });

  postReq.write(postData);
  postReq.end();
}

// Timeout de sécurité
setTimeout(() => {
  console.log('\n⏱️ Timeout - fermeture');
  process.exit(1);
}, 10000);

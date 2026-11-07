import React, { useState } from 'react';
import IntegrationSnippets from '../components/IntegrationSnippets';

export default function DocsPage() {
  const [selectedKey, setSelectedKey] = useState('ax_live_9f8a2b3c4d5e6f7a');

  return (
    <div className="page-layout" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <h1 className="page-title">Documentation & Integrations</h1>
        <p className="page-subtitle">
          Integrate AxionLimit into any application stack using lightweight HTTP REST requests or framework-native middleware.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
        {/* Core Concepts Card */}
        <div className="card">
          <div className="panel-title">⚡ How AxionLimit Works</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: 16 }}>
            AxionLimit operates as an ultra-fast HTTP rate-checking engine backed by Redis Lua sliding window algorithms. 
            Before processing an incoming client request, your server or API Gateway sends a lightweight check to AxionLimit.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
            marginTop: 16
          }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--accent-light)', marginBottom: 6 }}>1. REST API Request</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Your app sends a <code style={{ color: 'var(--accent-light)' }}>GET /api/check-limit</code> call with <code style={{ color: 'var(--accent-light)' }}>x-api-key</code> header.
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#22C55E', marginBottom: 6 }}>2. HTTP 200 Allowed</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                If requests are within limits, AxionLimit responds with status 200 and remaining request counts.
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#FF4D4D', marginBottom: 6 }}>3. HTTP 429 Blocked</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                If rate limits are exceeded, AxionLimit returns status 429 with <code style={{ color: '#FF4D4D' }}>retryAfter</code> seconds.
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#F59E0B', marginBottom: 6 }}>4. Fail-Open Protection</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                If AxionLimit server cannot be reached, your app catches the exception and allows the request through safely.
              </div>
            </div>
          </div>
        </div>

        {/* Code Snippets Section */}
        <div className="card">
          <div className="panel-title flex items-center justify-between">
            <span>💻 Framework Integration Snippets</span>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Test Key:</span>
              <input
                className="input"
                style={{ padding: '4px 8px', fontSize: '0.8rem', width: 220 }}
                value={selectedKey}
                onChange={e => setSelectedKey(e.target.value)}
                placeholder="Enter API Key"
              />
            </div>
          </div>

          <IntegrationSnippets apiKey={selectedKey} />
        </div>

        {/* REST API Specification Card */}
        <div className="card">
          <div className="panel-title">📖 REST API Specification</div>
          
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span className="badge badge-accent" style={{ fontWeight: 700 }}>GET / POST</span>
              <code style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{(import.meta.env.VITE_API_BASE_URL || 'http://axionlimit-alb-693430163.ap-south-1.elb.amazonaws.com') + '/api/check-limit'}</code>
            </div>

            <div style={{ fontSize: '0.875rem', fontWeight: 600, margin: '14px 0 6px', color: 'var(--text-main)' }}>Headers</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', marginBottom: 16 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>Header</th>
                  <th style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>Type</th>
                  <th style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px' }}><code style={{ color: 'var(--accent-light)' }}>x-api-key</code></td>
                  <td style={{ padding: '8px', color: 'var(--text-muted)' }}>String</td>
                  <td style={{ padding: '8px' }}>Your project API Key generated from the AxionLimit dashboard. (Required)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px' }}><code style={{ color: 'var(--accent-light)' }}>x-user-id</code></td>
                  <td style={{ padding: '8px', color: 'var(--text-muted)' }}>String</td>
                  <td style={{ padding: '8px' }}>Unique end-user identifier for per-user rate limiting (e.g. user ID, session ID, IP). (Optional)</td>
                </tr>
              </tbody>
            </table>

            <div style={{ fontSize: '0.875rem', fontWeight: 600, margin: '14px 0 6px', color: 'var(--text-main)' }}>Query Parameters</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', marginBottom: 16 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>Parameter</th>
                  <th style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>Type</th>
                  <th style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px' }}><code style={{ color: 'var(--accent-light)' }}>endpoint</code></td>
                  <td style={{ padding: '8px', color: 'var(--text-muted)' }}>String</td>
                  <td style={{ padding: '8px' }}>Target endpoint path (e.g. <code style={{ color: 'var(--accent-light)' }}>/api/v1/users</code>). Used for telemetry analytics.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px' }}><code style={{ color: 'var(--accent-light)' }}>userId</code></td>
                  <td style={{ padding: '8px', color: 'var(--text-muted)' }}>String</td>
                  <td style={{ padding: '8px' }}>Alternative query parameter to supply the end-user identifier for per-user rate limiting.</td>
                </tr>
              </tbody>
            </table>

            <div style={{ fontSize: '0.875rem', fontWeight: 600, margin: '14px 0 6px', color: 'var(--text-main)' }}>Response Headers & Statuses</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: 'var(--bg-card)', padding: 12, borderRadius: 6, border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, color: '#22C55E', marginBottom: 6 }}>HTTP 200 OK</div>
                <pre style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {JSON.stringify({ allowed: true, remaining: 98, retryAfter: 0 }, null, 2)}
                </pre>
              </div>

              <div style={{ background: 'var(--bg-card)', padding: 12, borderRadius: 6, border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, color: '#FF4D4D', marginBottom: 6 }}>HTTP 429 Too Many Requests</div>
                <pre style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {JSON.stringify({ allowed: false, remaining: 0, retryAfter: 14 }, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

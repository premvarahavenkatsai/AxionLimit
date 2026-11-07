import React, { useState, useEffect } from 'react';
import { getApiKeys, checkRateLimit } from '../api/client';
import { useToast } from '../components/Toast';

export default function SandboxPage() {
  const toast = useToast();
  const [keys, setKeys] = useState([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [rawKey, setRawKey] = useState('');
  const [endpoint, setEndpoint] = useState('/api/v1/example');
  const [userId, setUserId] = useState('');
  const [clientIp, setClientIp] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [autoFire, setAutoFire] = useState(false);
  const [autoInterval, setAutoInterval] = useState(null);

  useEffect(() => {
    getApiKeys()
      .then(res => {
        const k = res.data.keys || [];
        setKeys(k);
        if (k.length > 0) setSelectedKey(k[0]._id);
      })
      .catch(() => toast('Failed to load keys.', 'error'));
  }, []);

  const fireRequest = async () => {
    const keyToUse = rawKey.trim() ? rawKey.trim() : selectedKey;
    const isKeyId = !rawKey.trim() && !!selectedKey;

    if (!keyToUse) {
      toast('Please select an API key or paste a raw key first.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await checkRateLimit(keyToUse, endpoint, isKeyId, userId.trim(), clientIp.trim());
      const data = res.data;
      setResult({ ...data, status: res.status, targetUserId: userId.trim(), targetIp: clientIp.trim() });
      setHistory(prev => [
        { allowed: data.allowed, remaining: data.remaining, time: new Date().toLocaleTimeString(), endpoint, targetUserId: userId.trim(), targetIp: clientIp.trim() },
        ...prev.slice(0, 19)
      ]);
    } catch (err) {
      const data = err.response?.data || {};
      const status = err.response?.status || 429;
      const reason = data.reason || (status === 403 ? 'IP_TEMPORARILY_BLOCKED' : 'RATE_LIMIT_EXCEEDED');
      const message = data.message || (status === 403 ? 'Access denied for this IP.' : 'Too many requests. Please slow down.');

      if (status === 403) {
        toast(`🚨 ${message}`, 'error');
        setAutoFire(false);
      }

      setResult({
        allowed: false,
        remaining: 0,
        retryAfter: data.retryAfter || 1,
        status,
        reason,
        message,
        targetUserId: userId.trim(),
        targetIp: clientIp.trim()
      });
      setHistory(prev => [
        { allowed: false, remaining: 0, time: new Date().toLocaleTimeString(), endpoint, targetUserId: userId.trim(), targetIp: clientIp.trim(), reason, status },
        ...prev.slice(0, 19)
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFire) {
      const id = setInterval(() => {
        fireRequest();
      }, 600);
      setAutoInterval(id);
      return () => clearInterval(id);
    } else {
      if (autoInterval) clearInterval(autoInterval);
    }
  }, [autoFire, selectedKey, rawKey, endpoint, clientIp]);

  const selectedKeyObj = keys.find(k => k._id === selectedKey);
  const hasValidKey = Boolean(rawKey.trim() || selectedKey);

  return (
    <div className="page-layout">
      <div className="page-header">
        <h1 className="page-title">Rate Limit Sandbox</h1>
        <p className="page-subtitle">Test your API key limits in real-time. Watch the sliding window in action.</p>
      </div>

      <div className="sandbox-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="panel-title">⚙️ Configuration</div>

            <div style={{ marginBottom: 14 }}>
              <label className="label">Select API Key</label>
              {keys.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '10px 0' }}>
                  No API keys found. Create one in the Dashboard first.
                </div>
              ) : (
                <select
                  className="select"
                  value={selectedKey}
                  onChange={e => setSelectedKey(e.target.value)}
                >
                  {keys.map(k => (
                    <option key={k._id} value={k._id}>{k.name} — {k.keyIdentifier} ({k.rateLimit.limit}r/{k.rateLimit.windowMs / 1000}s)</option>
                  ))}
                </select>
              )}
            </div>

            {selectedKeyObj && (
              <div style={{
                display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16,
                padding: '10px 14px', background: 'var(--bg-input)',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)'
              }}>
                <span className="badge badge-accent">Limit: {selectedKeyObj.rateLimit.limit} req</span>
                <span className="badge badge-blue">Window: {selectedKeyObj.rateLimit.windowMs / 1000}s</span>
                <span className={`badge ${selectedKeyObj.isActive ? 'badge-green' : 'badge-red'}`}>
                  {selectedKeyObj.isActive ? 'Active' : 'Disabled'}
                </span>
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label className="label">Paste Raw API Key (Optional)</label>
              <input className="input" type="password" value={rawKey} onChange={e => setRawKey(e.target.value)} placeholder="ax_… (Leave blank to use selected key above)" autoComplete="off" />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {rawKey.trim() ? '🔑 Mode: Using pasted secret key' : selectedKeyObj ? `✅ Mode: Using selected key "${selectedKeyObj.name}"` : '⚠️ Select a key above or paste raw secret'}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="label">Target Endpoint</label>
              <input
                className="input"
                value={endpoint}
                onChange={e => setEndpoint(e.target.value)}
                placeholder="/api/v1/resource"
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="label">User ID / Identifier (Optional)</label>
              <input
                className="input"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                placeholder="e.g. user_101 (Leave blank for global key limit)"
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {userId.trim() ? `👤 Per-user rate limiting enabled for "${userId.trim()}"` : '🌐 Global rate limiting mode (all users share quota)'}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="label">Simulated Client IP (Optional, x-user-ip)</label>
              <input
                className="input"
                value={clientIp}
                onChange={e => setClientIp(e.target.value)}
                placeholder="e.g. 192.168.1.50 or 203.0.113.5"
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {clientIp.trim() ? `🛡️ Testing IP Access Control for "${clientIp.trim()}"` : '🌐 Default client IP detection'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={fireRequest}
                disabled={loading || !hasValidKey}
              >
                {loading ? <><div className="spinner" style={{ width: 16, height: 16, borderTopColor: '#000' }} /> Sending...</> : '🚀 Fire Request'}
              </button>
              <button
                className={`btn ${autoFire ? 'btn-danger' : 'btn-ghost'}`}
                onClick={() => setAutoFire(f => !f)}
                disabled={!hasValidKey}
              >
                {autoFire ? '⏹ Stop' : '⚡ Auto-Fire'}
              </button>
            </div>

            {autoFire && (
              <p style={{ marginTop: 10, fontSize: '0.78rem', color: 'var(--accent)' }}>
                ⚡ Auto-firing every 600ms to trigger rate limits...
              </p>
            )}
          </div>

          <div className="card">
            <div className="panel-title">📜 Request History</div>
            {history.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <div className="empty-icon">🕐</div>
                <div>No requests fired yet.</div>
              </div>
            ) : (
              <div className="fire-history">
                {history.map((h, i) => (
                  <div key={i} className="history-item">
                    <div className={`history-dot ${h.allowed ? 'allowed' : 'blocked'}`} />
                    <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{h.endpoint}</span>
                      {h.targetUserId && (
                        <span className="badge badge-accent" style={{ fontSize: '0.7rem', padding: '1px 5px' }}>
                          👤 {h.targetUserId}
                        </span>
                      )}
                    </span>
                    <span style={{ color: h.allowed ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                      {h.allowed ? 'ALLOWED' : 'BLOCKED'}
                    </span>
                    <span style={{ color: 'var(--text-muted)', minWidth: 60, textAlign: 'right' }}>{h.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="panel-title">📋 Live Result</div>
            {result === null ? (
              <div className="empty-state" style={{ height: 280 }}>
                <div className="empty-icon">🎯</div>
                <div>Fire a request to see the result here.</div>
              </div>
            ) : (
              <div className={`sandbox-result ${result.allowed ? 'allowed' : 'blocked'}`}>
                <span className="sandbox-status-icon">
                  {result.allowed ? '✅' : result.status === 403 ? '🚨' : '🚫'}
                </span>
                <div className={`sandbox-status-text`} style={{ color: result.allowed ? 'var(--green)' : 'var(--red)' }}>
                  {result.allowed ? 'Request Allowed' : result.status === 403 ? 'IP Access Denied' : 'Rate Limit Exceeded'}
                </div>

                {result.message && !result.allowed && (
                  <div style={{
                    marginTop: 8,
                    marginBottom: 12,
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: 'var(--red)',
                    fontSize: '0.8125rem',
                    lineHeight: 1.4,
                    textAlign: 'center'
                  }}>
                    {result.message}
                  </div>
                )}

                <div className="sandbox-meta">
                  <div className="sandbox-meta-row">
                    <span className="sandbox-meta-key">Rate Limit Mode</span>
                    <span className="sandbox-meta-val" style={{ color: 'var(--accent-light)' }}>
                      {result.targetUserId ? `👤 Per-User (${result.targetUserId})` : '🌐 Global (API Key)'}
                    </span>
                  </div>
                  <div className="sandbox-meta-row">
                    <span className="sandbox-meta-key">HTTP Status</span>
                    <span className="sandbox-meta-val" style={{ color: result.status === 403 ? 'var(--red)' : 'inherit' }}>
                      {result.allowed ? '200 OK' : result.status === 403 ? '403 Forbidden' : '429 Too Many Requests'}
                    </span>
                  </div>
                  {result.reason && (
                    <div className="sandbox-meta-row">
                      <span className="sandbox-meta-key">Block Reason</span>
                      <span className="sandbox-meta-val" style={{ color: 'var(--red)', fontWeight: 700 }}>
                        {result.reason}
                      </span>
                    </div>
                  )}
                  <div className="sandbox-meta-row">
                    <span className="sandbox-meta-key">Remaining Requests</span>
                    <span className="sandbox-meta-val" style={{ color: result.remaining === 0 ? 'var(--red)' : 'var(--green)' }}>
                      {result.remaining}
                    </span>
                  </div>
                  <div className="sandbox-meta-row">
                    <span className="sandbox-meta-key">Retry After</span>
                    <span className="sandbox-meta-val">
                      {result.retryAfter > 0 ? `${result.retryAfter}s` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {history.length > 0 && (
            <div className="card">
              <div className="panel-title">📊 Session Stats</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ textAlign: 'center', padding: '14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--green)' }}>
                    {history.filter(h => h.allowed).length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Allowed</div>
                </div>
                <div style={{ textAlign: 'center', padding: '14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--red)' }}>
                    {history.filter(h => !h.allowed).length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Blocked</div>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div className="progress-bar" style={{ height: 8, borderRadius: 4 }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(history.filter(h => h.allowed).length / history.length) * 100}%`,
                      background: 'var(--green)'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Allow rate: {((history.filter(h => h.allowed).length / history.length) * 100).toFixed(0)}%</span>
                  <span>Total: {history.length}</span>
                </div>
              </div>
            </div>
          )}

          <div className="card" style={{ border: '1px solid var(--accent-dim)' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>How it works</div>
              The <strong>Sliding Window Log</strong> algorithm uses Redis Sorted Sets (ZSET) to track
              each request's exact timestamp. When a request arrives, it prunes all entries older
              than the window, counts the remaining entries, and either allows or blocks the request
              atomically using a Lua script — preventing race conditions even under heavy load.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

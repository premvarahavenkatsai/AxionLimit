import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/Toast';
import {
  getStats, resetStats,
  getApiKeys, createApiKey, rotateApiKey, updateApiKey, deleteApiKey as deleteKey
} from '../api/client';
import IntegrationSnippets from '../components/IntegrationSnippets';

function StatCard({ label, value, colorClass, icon, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${colorClass}`}>{value.toLocaleString()}</div>
      <div className="stat-footer">
        <span>{icon} {sub}</span>
      </div>
    </div>
  );
}

function Leaderboard({ title, items }) {
  const max = items[0]?.value || 1;
  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="panel-title">{title}</div>
      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <div>No data yet. Make some API requests!</div>
        </div>
      ) : (
        items.map((item, i) => (
          <div key={i} className="leaderboard-row">
            <div className={`leaderboard-rank ${i < 3 ? 'top' : ''}`}>{i + 1}</div>
            <div className="leaderboard-name">{item.name}</div>
            <div className="leaderboard-bar-wrap">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${(item.value / max) * 100}%` }} />
              </div>
            </div>
            <div className="leaderboard-count">{item.value}</div>
          </div>
        ))
      )}
    </div>
  );
}

function IpRulesModal({ keyObj, onClose, onSave }) {
  const toast = useToast();
  const [whitelist, setWhitelist] = useState((keyObj.ipWhitelist || []).join(', '));
  const [blacklist, setBlacklist] = useState((keyObj.ipBlacklist || []).join(', '));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const ipWhitelist = whitelist.split(',').map(s => s.trim()).filter(Boolean);
      const ipBlacklist = blacklist.split(',').map(s => s.trim()).filter(Boolean);
      await updateApiKey(keyObj._id, { ipWhitelist, ipBlacklist });
      toast('IP Access Rules updated successfully!', 'success');
      onSave();
      onClose();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to update IP rules.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: 16
    }}>
      <div className="card" style={{ maxWidth: 520, width: '100%' }}>
        <div className="panel-title flex items-center justify-between" style={{ marginBottom: 16 }}>
          <span>🛡️ IP Access Rules — {keyObj.name}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="label">Allowed IPs (Whitelist)</label>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>
            Comma-separated IPs. If set, <b>ONLY</b> these IPs can use this key. Leave empty for all IPs.
          </p>
          <input
            className="input"
            placeholder="e.g. 192.168.1.100, 10.0.0.1"
            value={whitelist}
            onChange={e => setWhitelist(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label className="label">Blocked IPs (Blacklist)</label>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>
            Comma-separated IPs to block immediately (403 Forbidden).
          </p>
          <input
            className="input"
            placeholder="e.g. 203.0.113.5, 45.33.21.10"
            value={blacklist}
            onChange={e => setBlacklist(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save IP Rules'}
          </button>
        </div>
      </div>
    </div>
  );
}

function KeyItem({ k, onDelete, onRotate, onToggle, onViewSnippets, onEditIpRules }) {
  const wlCount = k.ipWhitelist?.length || 0;
  const blCount = k.ipBlacklist?.length || 0;

  return (
    <div className="key-item">
      <div className="key-meta">
        <div className="key-name">{k.name}</div>
        <div className="key-string-row">
          <span className="key-string">{k.keyIdentifier}</span>
          {wlCount > 0 && <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>🔒 {wlCount} Allowed IPs</span>}
          {blCount > 0 && <span className="badge badge-red" style={{ fontSize: '0.7rem' }}>🚫 {blCount} Blocked IPs</span>}
        </div>
      </div>
      <div className="key-actions">
        <span className="badge badge-accent" style={{ flexShrink: 0 }}>
          {k.rateLimit.limit}r / {k.rateLimit.windowMs / 1000}s
        </span>
        <span className={`badge ${k.isActive ? 'badge-green' : 'badge-red'}`}>{k.isActive ? 'Active' : 'Disabled'}</span>
        <button className="btn btn-xs btn-ghost" onClick={() => onEditIpRules(k)} title="IP Whitelist & Blacklist Rules" style={{ fontSize: '0.75rem' }}>
          🛡️ IP Rules
        </button>
        <button className="btn btn-xs btn-ghost" onClick={() => onViewSnippets(k.keyIdentifier)} title="View Code Snippets" style={{ fontSize: '0.75rem' }}>
          &lt;/&gt; Code
        </button>
        <button className="btn-icon" onClick={() => onToggle(k)} title={k.isActive ? 'Disable key' : 'Enable key'}>{k.isActive ? '⏸' : '▶'}</button>
        <button className="btn-icon danger" onClick={() => onDelete(k._id)} title="Revoke">🗑</button>
        <button className="btn-icon" onClick={() => onRotate(k._id)} title="Rotate key">🔄</button>
      </div>
    </div>
  );
}

function CreateKeyForm({ onCreated }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [limit, setLimit] = useState(100);
  const [windowMs, setWindowMs] = useState(60000);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await createApiKey({ name, limit: parseInt(limit), windowMs: parseInt(windowMs) });
      onCreated(res.data.rawKey);
      toast('API Key created — copy it from the one-time display.', 'success');
      setName(''); setLimit(100); setWindowMs(60000); setOpen(false);
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to create key.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {!open ? (
        <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
          + New API Key
        </button>
      ) : (
        <div className="create-key-form">
          <div>
            <label className="label">Key Name</label>
            <input className="input" placeholder="e.g. Production Mobile" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="form-row">
            <div>
              <label className="label">Request Limit</label>
              <input className="input" type="number" min={1} value={limit} onChange={e => setLimit(e.target.value)} />
            </div>
            <div>
              <label className="label">Window (ms)</label>
              <input className="input" type="number" min={1000} step={1000} value={windowMs} onChange={e => setWindowMs(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={loading || !name}>
              {loading ? 'Creating...' : 'Create Key'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px', fontSize: '0.8125rem'
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>Tick {label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { theme } = useTheme();
  const toast = useToast();

  const [stats, setStats] = useState({ total: 0, allowed: 0, blocked: 0, topUsers: [], topEndpoints: [] });
  const [chartData, setChartData] = useState([]);
  const [prevStats, setPrevStats] = useState(null);
  const [tickIndex, setTickIndex] = useState(0);

  const [keys, setKeys] = useState([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [oneTimeKey, setOneTimeKey] = useState('');
  const [snippetModalKey, setSnippetModalKey] = useState(null);
  const [ipModalKey, setIpModalKey] = useState(null);

  const gridColor = theme === 'dark' ? '#222' : '#E5E7EB';
  const textColor = theme === 'dark' ? '#888' : '#9CA3AF';

  const loadKeys = useCallback(async () => {
    try {
      const res = await getApiKeys();
      setKeys(res.data.keys || []);
    } catch {
      toast('Failed to load API keys.', 'error');
    } finally {
      setKeysLoading(false);
    }
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await getStats();
        const s = res.data.stats;
        setStats(s);

        setChartData(prev => {
          const newPoint = {
            tick: tickIndex,
            Allowed: s.allowed,
            Blocked: s.blocked,
          };
          const next = [...prev, newPoint];
          return next.slice(-20);
        });
        setTickIndex(i => i + 1);
        setPrevStats(s);
      } catch {}
    };

    poll();
    const id = setInterval(poll, 4000);
    return () => clearInterval(id);
  }, []);

  const handleDelete = async (id) => {
    try {
      await deleteKey(id);
      toast('API key revoked.', 'success');
      loadKeys();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to delete key.', 'error');
    }
  };

  const handleCopy = (key) => {
    navigator.clipboard.writeText(key);
    toast('Key copied to clipboard!', 'success');
  };

  const handleRotate = async (id) => {
    try {
      const res = await rotateApiKey(id);
      setOneTimeKey(res.data.rawKey);
      toast('Key rotated — copy the new value now.', 'success');
      loadKeys();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to rotate key.', 'error');
    }
  };

  const handleToggle = async (key) => {
    try {
      await updateApiKey(key._id, { isActive: !key.isActive });
      toast(`Key ${key.isActive ? 'disabled' : 'enabled'}.`, 'success');
      loadKeys();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to update key.', 'error');
    }
  };

  const handleReset = async () => {
    try {
      await resetStats();
      setChartData([]);
      setTickIndex(0);
      setStats({ total: 0, allowed: 0, blocked: 0, topUsers: [], topEndpoints: [] });
      toast('Analytics reset!', 'success');
    } catch {
      toast('Failed to reset stats.', 'error');
    }
  };

  const blockRate = stats.total > 0 ? ((stats.blocked / stats.total) * 100).toFixed(1) : '0.0';

  return (
    <div className="page-layout">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Real-time API rate limiting telemetry</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleReset}>
          🔄 Reset Stats
        </button>
      </div>

      <div className="stats-row">
        <StatCard label="Total Requests" value={stats.total} colorClass="accent" icon="📡" sub="All time" />
        <StatCard label="Allowed" value={stats.allowed} colorClass="green" icon="✅" sub="Passed" />
        <StatCard label="Blocked" value={stats.blocked} colorClass="red" icon="🚫" sub="Rate limited" />
        <StatCard
          label="Block Rate"
          value={parseFloat(blockRate)}
          colorClass={parseFloat(blockRate) > 20 ? 'red' : 'blue'}
          icon="📊"
          sub="Percentage"
        />
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="panel-title">
            Request Volume
            <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>● Live</span>
          </div>
          {chartData.length === 0 ? (
            <div className="empty-state" style={{ height: 240 }}>
              <div className="empty-icon">📈</div>
              <div>Waiting for API traffic...</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="tick" stroke={textColor} tick={{ fontSize: 11 }} />
                <YAxis stroke={textColor} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '0.8rem', color: textColor }} />
                <Line type="monotone" dataKey="Allowed" stroke="#22C55E" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Blocked" stroke="#FF4D4D" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <Leaderboard title="🔥 Top Endpoints" items={stats.topEndpoints} />
      </div>

      <div className="bottom-grid">
        <div className="card">
          <div className="panel-title">
            API Keys
            <CreateKeyForm onCreated={(rawKey) => { setOneTimeKey(rawKey); loadKeys(); }} />
          </div>
          {oneTimeKey && (
            <div className="create-key-form" style={{ marginBottom: 14 }}>
              <label className="label">Copy this key now — it will not be shown again</label>
              <div className="key-string-row"><code className="key-string">{oneTimeKey}</code><button className="btn-icon" onClick={() => handleCopy(oneTimeKey)}>📋</button></div>
              <button className="btn btn-ghost btn-sm" onClick={() => setOneTimeKey('')}>I copied it</button>
            </div>
          )}
          {keysLoading ? (
            <div className="empty-state"><div className="spinner" /></div>
          ) : keys.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔑</div>
              <div>No API keys yet. Create your first one!</div>
            </div>
          ) : (
            <div className="key-list">
              {keys.map(k => (
                <KeyItem
                  key={k._id}
                  k={k}
                  onDelete={handleDelete}
                  onRotate={handleRotate}
                  onToggle={handleToggle}
                  onViewSnippets={(keyId) => setSnippetModalKey(keyId)}
                  onEditIpRules={(keyObj) => setIpModalKey(keyObj)}
                />
              ))}
            </div>
          )}
        </div>

        <Leaderboard title="👤 Top API Key Users" items={stats.topUsers} />
      </div>

      {/* IP Rules Modal */}
      {ipModalKey && (
        <IpRulesModal
          keyObj={ipModalKey}
          onClose={() => setIpModalKey(null)}
          onSave={() => loadKeys()}
        />
      )}

      {/* Code Snippets Modal */}
      {snippetModalKey && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justify: 'center',
          zIndex: 9999,
          padding: 16
        }}>
          <div className="card" style={{
            maxWidth: 760,
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative'
          }}>
            <div className="panel-title flex items-center justify-between" style={{ marginBottom: 12 }}>
              <span>🛠 Integration Snippets</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setSnippetModalKey(null)}>✕ Close</button>
            </div>
            <IntegrationSnippets apiKey={snippetModalKey} compact={true} />
          </div>
        </div>
      )}
    </div>
  );
}

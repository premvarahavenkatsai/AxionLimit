import React, { useState } from 'react';
import { useToast } from './Toast';

const DEFAULT_SERVER_URL = import.meta.env.VITE_API_BASE_URL || 'http://axionlimit-alb-693430163.ap-south-1.elb.amazonaws.com';

export function getLanguageSnippets(apiKey = 'YOUR_API_KEY', serverUrl = DEFAULT_SERVER_URL) {
  return [
    {
      id: 'curl',
      name: 'cURL / REST API',
      icon: '⬛',
      language: 'bash',
      description: 'Make a direct HTTP GET request to check rate limits. Pass x-user-id header for per-user rate limiting.',
      code: `curl -X GET "${serverUrl}/api/check-limit?endpoint=/api/resource" \\
  -H "x-api-key: ${apiKey}" \\
  -H "x-user-id: user_123"`
    },
    {
      id: 'node',
      name: 'Node.js / Express',
      icon: '🟩',
      language: 'javascript',
      description: 'Express HTTP middleware checking per-user rate limits.',
      code: `const axios = require('axios');

function axionLimitMiddleware(req, res, next) {
  const userId = req.user?.id || req.headers['x-user-id'] || req.ip;

  axios.get('${serverUrl}/api/check-limit', {
    headers: {
      'x-api-key': '${apiKey}',
      'x-user-id': userId
    },
    params: { endpoint: req.path },
    timeout: 3000
  }).then(response => {
    if (response.data.remaining !== undefined) {
      res.setHeader('X-RateLimit-Remaining', response.data.remaining);
    }
    return next();
  }).catch(err => {
    if (err.response?.status === 429) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded for this user. Please slow down.',
        retryAfter: err.response.data?.retryAfter || 1
      });
    }
    // Fail open if AxionLimit service is unavailable
    console.warn('[AxionLimit] Service unavailable. Failing open.');
    return next();
  });
}

// Usage in Express:
// app.use('/api/', axionLimitMiddleware);`
    },
    {
      id: 'python-fastapi',
      name: 'Python (FastAPI)',
      icon: '🟦',
      language: 'python',
      description: 'Async HTTP middleware for FastAPI using httpx.',
      code: `import httpx
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

class AxionLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        async with httpx.AsyncClient() as client:
            try:
                res = await client.get(
                    "${serverUrl}/api/check-limit",
                    headers={"x-api-key": "${apiKey}"},
                    params={"endpoint": request.url.path},
                    timeout=3.0
                )
                if res.status_code == 429:
                    retry_after = res.json().get("retryAfter", 1)
                    return Response(
                        content='{"error": "Too Many Requests"}',
                        status_code=429,
                        media_type="application/json",
                        headers={"X-RateLimit-RetryAfter": str(retry_after)}
                    )
            except Exception:
                # Fail open if AxionLimit is unreachable
                pass

        return await call_next(request)

# Usage in FastAPI app:
# app.add_middleware(AxionLimitMiddleware)`
    },
    {
      id: 'python-flask',
      name: 'Python (Flask)',
      icon: '🐍',
      language: 'python',
      description: 'Flask request decorator or before_request hook using requests.',
      code: `import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.before_request
def check_axion_limit():
    try:
        res = requests.get(
            "${serverUrl}/api/check-limit",
            headers={"x-api-key": "${apiKey}"},
            params={"endpoint": request.path},
            timeout=3.0
        )
        if res.status_code == 429:
            data = res.json()
            return jsonify({
                "error": "Too Many Requests",
                "retryAfter": data.get("retryAfter", 1)
            }), 429
    except requests.RequestException:
        # Fail open
        pass

# All endpoints are now rate-limited!`
    },
    {
      id: 'go',
      name: 'Go (Gin)',
      icon: '🪟',
      language: 'go',
      description: 'Gin framework HTTP middleware in Go.',
      code: `package main

import (
	"net/http"
	"time"
	"github.com/gin-gonic/gin"
)

func AxionLimitMiddleware(apiKey string, serverURL string) gin.HandlerFunc {
	return func(c *gin.Context) {
		client := &http.Client{Timeout: 3 * time.Second}
		reqURL := serverURL + "/api/check-limit?endpoint=" + c.Request.URL.Path

		req, err := http.NewRequest("GET", reqURL, nil)
		if err == nil {
			req.Header.Set("x-api-key", apiKey)
			resp, err := client.Do(req)
			if err == nil {
				defer resp.Body.Close()
				if resp.StatusCode == 429 {
					c.AbortWithStatusJSON(429, gin.H{
						"error": "Too Many Requests",
						"message": "Rate limit exceeded.",
					})
					return
				}
			}
		}
		c.Next()
	}
}

// Usage in Gin:
// r.Use(AxionLimitMiddleware("${apiKey}", "${serverUrl}"))`
    },
    {
      id: 'php',
      name: 'PHP (Laravel)',
      icon: '🐘',
      language: 'php',
      description: 'Laravel HTTP Middleware using Guzzle HTTP client.',
      code: `<?php

namespace App\\Http\\Middleware;

use Closure;
use Illuminate\\Support\\Facades\\Http;

class AxionLimitMiddleware
{
    public function handle($request, Closure $next)
    {
        try {
            $response = Http::timeout(3)
                ->withHeaders(['x-api-key' => '${apiKey}'])
                ->get('${serverUrl}/api/check-limit', [
                    'endpoint' => $request->getPathInfo()
                ]);

            if ($response->status() === 429) {
                return response()->json([
                    'error' => 'Too Many Requests',
                    'retryAfter' => $response->json('retryAfter', 1)
                ], 429);
            }
        } catch (\\Exception $e) {
            // Fail open
        }

        return $next($request);
    }
}`
    },
    {
      id: 'java',
      name: 'Java (Spring Boot)',
      icon: '☕',
      language: 'java',
      description: 'Spring Boot OncePerRequestFilter implementation.',
      code: `package com.example.middleware;

import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;
import javax.servlet.*;
import javax.servlet.http.*;
import java.io.IOException;

public class AxionLimitFilter extends OncePerRequestFilter {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String apiKey = "${apiKey}";
    private final String serverUrl = "${serverUrl}";

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("x-api-key", apiKey);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            String url = serverUrl + "/api/check-limit?endpoint=" + req.getRequestURI();
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);

            if (response.getStatusCodeValue() == 429) {
                res.setStatus(429);
                res.setContentType("application/json");
                res.getWriter().write("{\\"error\\": \\"Too Many Requests\\"}");
                return;
            }
        } catch (Exception e) {
            // Fail open if rate limit service is unavailable
        }

        chain.doFilter(req, res);
    }
}`
    }
  ];
}

export default function IntegrationSnippets({ apiKey = 'YOUR_API_KEY', serverUrl = DEFAULT_SERVER_URL, compact = false }) {
  const snippets = getLanguageSnippets(apiKey, serverUrl);
  const [activeTab, setActiveTab] = useState(snippets[0].id);
  const toast = useToast();

  const currentSnippet = snippets.find(s => s.id === activeTab) || snippets[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentSnippet.code);
    toast(`${currentSnippet.name} integration code copied!`, 'success');
  };

  return (
    <div className="snippets-container" style={{ marginTop: compact ? 8 : 16 }}>
      <div className="snippets-header flex items-center justify-between" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>
          ⚡ Integration Code Generator
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Key: <code style={{ color: 'var(--accent-light)', background: 'var(--bg-card)', padding: '2px 6px', borderRadius: 4 }}>{apiKey.slice(0, 14)}...</code>
        </div>
      </div>

      {/* Tabs */}
      <div className="snippets-tabs" style={{
        display: 'flex',
        gap: 6,
        overflowX: 'auto',
        borderBottom: '1px solid var(--border)',
        paddingBottom: 8,
        marginBottom: 12
      }}>
        {snippets.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveTab(s.id)}
            className={`btn btn-xs ${activeTab === s.id ? 'btn-primary' : 'btn-ghost'}`}
            style={{
              whiteSpace: 'nowrap',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>{s.icon}</span>
            <span>{s.name}</span>
          </button>
        ))}
      </div>

      {/* Snippet Description */}
      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 8 }}>
        {currentSnippet.description}
      </div>

      {/* Code Block Container */}
      <div className="code-block-wrapper" style={{
        position: 'relative',
        background: 'var(--bg-dark, #0d1117)',
        borderRadius: 8,
        border: '1px solid var(--border)',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          background: 'rgba(255, 255, 255, 0.04)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '0.75rem',
          color: '#8b949e'
        }}>
          <span>{currentSnippet.language}</span>
          <button
            className="btn btn-xs btn-ghost"
            onClick={handleCopy}
            style={{ color: '#c9d1d9', borderColor: 'rgba(255,255,255,0.1)' }}
          >
            📋 Copy Code
          </button>
        </div>
        <pre style={{
          margin: 0,
          padding: '12px 16px',
          fontFamily: 'Fira Code, Consolas, Monaco, monospace',
          fontSize: '0.8125rem',
          lineHeight: '1.5',
          color: '#e6edf3',
          overflowX: 'auto',
          maxHeight: compact ? '220px' : '360px'
        }}>
          <code>{currentSnippet.code}</code>
        </pre>
      </div>
    </div>
  );
}

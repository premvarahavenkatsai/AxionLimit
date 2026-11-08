# AxionLimit — Centralized API Rate Limiter & Telemetry

**A centralized API rate-limiting service built to control API consumption, enforce usage policies, and monitor request activity using Redis.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-AxionLimit-brightgreen?style=for-the-badge)](http://axionlimit-frontend-1.s3-website.ap-south-1.amazonaws.com)

## Live Deployment

**[Visit AxionLimit](http://axionlimit-frontend-1.s3-website.ap-south-1.amazonaws.com)**

The application is deployed on AWS using S3, Application Load Balancer, EC2, and Amazon ElastiCache. 

## Overview

AxionLimit is a centralized API rate-limiting platform that allows developers to manage API keys, configure request limits, control API consumption, and monitor usage through a telemetry dashboard.

It uses Redis for high-speed request tracking and rate-limit enforcement, while MongoDB provides persistent storage for application data.

The system is designed to demonstrate how API traffic can be controlled through a centralized service rather than implementing rate-limiting logic independently in every application.

## Key Features

- **API Key Management:** Create and manage API keys with configurable usage policies.
- **Multiple Rate-Limiting Algorithms:** Supports Fixed Window, Sliding Window, and Token Bucket approaches.
- **Centralized Rate Limiting:** Enforces API consumption limits through a shared Redis instance.
- **Real-Time Request Tracking:** Tracks total, allowed, and blocked requests.
- **Telemetry Dashboard:** Visualizes API usage and request activity.
- **Authentication:** Google OAuth 2.0 authentication using Passport.js.
- **API Key Authorization:** Validates API keys and retrieves their associated configurations.
- **Redis Caching:** Uses Redis to cache API-key metadata and reduce repeated database lookups.
- **Persistent Storage:** Stores users and API-key configurations in MongoDB.
- **Automatic Process Management:** Uses PM2 to keep the backend process running.

## Tech Stack

| Category | Technologies |
|---|---|
| Frontend | React.js, JavaScript, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas |
| Cache & State Management | Redis, Amazon ElastiCache |
| Authentication | Passport.js, Google OAuth 2.0, JWT |
| Rate Limiting | Fixed Window, Sliding Window, Token Bucket |
| Telemetry | Redis INCR, EXPIRE, Sorted Sets (ZSET), Lua scripts |
| Deployment | AWS EC2, S3, Application Load Balancer |
| Process Management | PM2 |
| Version Control | Git, GitHub |

## System Architecture

```text
                    USERS
                      |
             +--------+--------+
             |                 |
             v                 v
        AWS S3 Frontend    Application Load
          (React.js)       Balancer (ALB)
                                |
                                v
                         AWS EC2 Instance
                         (Ubuntu Server)
                                |
                         Node.js + Express
                                |
                 +--------------+--------------+
                 |              |              |
                 v              v              v
             Passport.js    MongoDB Atlas   Redis
             Google OAuth   Persistent DB   ElastiCache
                                |              |
                                |              |
                           User Data      Rate Limiting
                           API Keys       Telemetry
                           Configurations Counters
```

### Deployment Architecture

- **Amazon S3:** Hosts the production React frontend.
- **Application Load Balancer:** Provides a public entry point and forwards incoming API requests to the backend.
- **Amazon EC2:** Runs the Node.js and Express backend.
- **PM2:** Manages the backend process and supports automatic restart.
- **MongoDB Atlas:** Stores persistent application data.
- **Amazon ElastiCache:** Hosts Redis for centralized rate-limit state, counters, and telemetry.

## Rate-Limiting Algorithms

AxionLimit supports three commonly used rate-limiting algorithms:

### 1. Fixed Window Counter

Divides time into fixed intervals and tracks the number of requests within each interval.

- Uses Redis counters and expiration.
- Simple and memory-efficient.
- Can allow bursts around window boundaries.

### 2. Sliding Window

Tracks requests over a rolling time interval to provide smoother rate enforcement.

- Uses Redis Sorted Sets (ZSET).
- Removes expired request timestamps.
- Calculates request counts within the active window.

### 3. Token Bucket

Maintains a bucket of tokens that are consumed when requests arrive.

- Supports controlled request bursts.
- Refills tokens over time.
- Rejects requests when sufficient tokens are unavailable.

## Redis & Telemetry

Redis plays a central role in AxionLimit by maintaining fast-changing request information.

Key Redis operations and data structures include:

| Redis Feature | Purpose |
|---|---|
| `INCR` | Increment request counters |
| `EXPIRE` | Set automatic key expiration |
| `ZSET` | Maintain timestamp-based request records |
| Lua Scripts | Execute rate-limiting operations atomically |
| Redis Pipeline | Batch telemetry updates efficiently |

Telemetry tracks:

- Total requests
- Allowed requests
- Blocked requests
- Request frequency

## Authentication & Authorization

AxionLimit uses Google OAuth 2.0 for user authentication.

API-key authorization follows a Redis-first lookup approach:

1. Extract the API key from the incoming request.
2. Check Redis for cached API-key metadata.
3. If metadata is unavailable, retrieve the configuration from MongoDB.
4. Cache the retrieved metadata in Redis.
5. Validate the API key and apply its configured rate limits.

This reduces repeated database queries while maintaining persistent API-key configurations in MongoDB.

## Project Structure

```text
AxionLimit/
|
|-- Backend/
|   |-- config/
|   |-- middleware/
|   |-- models/
|   |-- routes/
|   |-- services/
|   |-- server.js
|   |-- package.json
|
|-- Frontend/
|   |-- src/
|   |-- public/
|   |-- package.json
|   |-- vite.config.js
|
|-- README.md
```

*Note: Directory names may vary depending on the current repository structure.*

## Local Setup

### Prerequisites

- Node.js
- npm
- MongoDB Atlas account
- Redis instance
- Git

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd AxionLimit
```

### 2. Configure the Backend

```bash
cd Backend
npm install
```

Create a `.env` file:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
REDIS_URL=your_redis_connection_string
JWT_SECRET=your_jwt_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=your_google_callback_url

FRONTEND_URL=http://localhost:5173
```

### 3. Start the Backend

```bash
npm start
```

### 4. Configure the Frontend

Open another terminal:

```bash
cd Frontend
npm install
```

Configure the frontend environment:

```env
VITE_API_BASE_URL=http://localhost:5000
```

### 5. Start the Frontend

```bash
npm run dev
```

Open the local development URL provided by Vite.

## Future Improvements

- HTTPS with a custom domain using AWS Certificate Manager.
- CloudFront CDN integration for global frontend delivery.
- Multiple EC2 instances with Auto Scaling.
- Enhanced monitoring and alerting.
- Advanced rate-limit analytics and reporting.
- Distributed deployment and high availability.

## Author

**Bonumahanti Prem Varaha Venkat Sai**

B.Tech Computer Science and Engineering

[GitHub](https://github.com/)

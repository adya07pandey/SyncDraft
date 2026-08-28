# 🚀 SyncDraft — Real-Time Collaborative Editor

A real-time collaborative text editor that allows multiple users to edit the same document simultaneously using a custom **CRDT-based synchronization engine**.

Built with **React, AWS WebSocket API, Lambda, DynamoDB, Upstash Redis, and S3**.

## Architecture

![System Architecture](System_Architecture.png)

### How it works

- **WebSocket API** maintains real-time client connections.
- **AWS Lambda** processes document operations and runs the CRDT synchronization logic.
- **Redis** maintains active document state and connection mappings.
- **DynamoDB** stores the operation history for durable recovery.
- **S3** stores document snapshots to reduce replay overhead.

## Key Features

- Real-time multi-user collaborative editing
- CRDT-based conflict resolution without locks
- Vector clocks for tracking operation ordering
- Operation-based synchronization
- Insert, delete, and concurrent editing support
- Persistent operation history and snapshots
- Serverless and horizontally scalable architecture

## Performance

Tested using automated CRDT and WebSocket workloads:

- **52K+ CRDT operations/sec** across 50 replicas
- **100% replica convergence** under mixed workloads
- **0% packet loss** across 100 AWS WebSocket operations
- **~159 ms average WebSocket latency**
- **~171 ms p95 WebSocket latency**

## Tech Stack

**Frontend:** React  
**Backend:** AWS Lambda, API Gateway WebSocket  
**Storage:** DynamoDB, S3  
**State:** Upstash Redis  
**Synchronization:** Custom CRDT + Vector Clocks

## Links

[GitHub](https://github.com/adya07pandey/SyncDraft) | [Live Demo](https://sync-draft.vercel.app)

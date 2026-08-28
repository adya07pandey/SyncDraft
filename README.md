# Real-Time Collaborative Editing Engine (AWS-Native)

A cloud-native, distributed real-time collaborative text editing system built using **AWS WebSocket API, Lambda, DynamoDB, Upstash Redis, S3, and a custom CRDT implementation**.

SyncDraft enables multiple users to edit the same document simultaneously while maintaining **deterministic conflict resolution and replica convergence** without locks or centralized coordination.

---

## Overview

SyncDraft uses an **operation-based CRDT** to synchronize document changes between multiple users.

Instead of sending the entire document after every edit, clients generate atomic operations such as inserts and deletes. These operations are distributed through AWS WebSockets and applied independently at each replica.

The system is designed to provide:

- Real-time multi-user collaboration
- Deterministic conflict resolution
- Replica convergence under concurrent edits
- Eventually consistent synchronization
- Stateless server-side compute
- Durable operation persistence
- Snapshot-based recovery
- Horizontally scalable serverless infrastructure

---

## System Architecture

![System Architecture](System_Architecture.png)

### Data Flow

```text
Client 1 ──┐
Client 2 ──┤
Client N ──┘
      │
      ▼
AWS WebSocket API
      │
      ▼
AWS Lambda CRDT Engine
      │
      ├──────────► Upstash Redis
      │             Live document state
      │
      ├──────────► DynamoDB
      │             Immutable operation log
      │
      └──────────► S3
                    Document snapshots

# 🚀 Real-Time Collaborative Editing Engine (AWS-Native)

A cloud-native, distributed real-time collaborative text editing system built using AWS WebSocket API, Lambda, DynamoDB, Upstash Redis, S3, and a custom Conflict-Free Replicated Data Type (CRDT) implementation.

This system enables multiple users to edit the same document simultaneously with strong convergence guarantees, low latency, and fault tolerance — without using locks or centralized coordination.

---

## Overview

Traditional collaborative systems rely on operational transforms or centralized coordination. This project implements a CRDT-based approach, allowing operations to be applied in any order while ensuring all replicas converge to the same final state.

The system is designed to be:

- Horizontally scalable  
- Eventually consistent  
- Fault tolerant  
- Stateless at the compute layer  
- Durable at the storage layer  

---

## System Architecture
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
![System Architecture](System_Architecture.png)


### Component Responsibilities

**API Gateway (WebSocket)**  
- Manages persistent connections  
- Routes messages based on action type  

**AWS Lambda**  
- Processes JOIN_DOC, SEND_OP, SYNC_STATE events  
- Applies CRDT logic  
- Maintains stateless execution  

**Upstash Redis**  
- Stores active document state  
- Maintains connection-to-document mappings  
- Serverless Redis with global low-latency access 

**DynamoDB**  
- Stores immutable operation logs  
- Provides durable persistence  
- Enables replay for recovery  

**S3**  
- Stores periodic document snapshots  
- Reduces replay cost during recovery  

---

## Core Concepts

### Operation-Based Synchronization

Instead of syncing entire documents, the system synchronizes atomic operations:

```json
{
  "type": "insert",
  "id": "user-123-170000000",
  "char": "A",
  "left": "node-456"
}

---
title: "Pilot-aware architecture: managing experimental traffic in event-driven systems"
summary: Canary deployments and business pilots in HTTP-based systems rely on a proxy that intercepts traffic before it reaches the service. Kafka has no such proxy. This post explains how to design a header-based filtering contract that supports segmented pilots, canary deployments, and blue/green strategies across REST and Kafka using the same mechanism.
date: 2026-04-27
tags:
  - Kafka
  - EDA
  - AsyncAPI
  - Spring Boot
  - Architecture
featured: false
featuredImage: assets/articles/2026-04-27-pilot-aware-architecture-experimental-traffic-eda/pilot-aware-architecture.png
featuredImageAlt: "Pilot-aware architecture: managing experimental traffic in event-driven systems"
readingTime: "12 min read"

draft: true
---

# 2026-04-10-pilot-aware-architecture-experimental-traffic-eda.md

1. The problem HTTP does not have in Kafka
2. What piloting means in EDA and why it is different
3. Two governance options: separate topics vs context in the message
4. The filtering contract: the rule that makes everything simple
5. Operation modes: PRODUCTION_ONLY, SEGMENT_ONLY, ALL
6. The code: RecordFilterStrategy as a minimal implementation
7. Transparent propagation with Micrometer Tracing baggage
8. Entry and exit strategies: segmented pilot, canary, blue/green
9. API-Gateway as the decision point: where the percentage lives
10. What this mechanism does not solve: topic deprecation, dynamic feature toggling
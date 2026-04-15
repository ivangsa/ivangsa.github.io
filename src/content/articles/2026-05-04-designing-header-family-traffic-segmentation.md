---
title: "Designing a header family for traffic segmentation: the decision process"
summary: Most posts about canary deployments show you the implementation. This one shows the thinking behind the contract. How we went from x-pilot-id to a coherent family of headers that covers canary, segmented pilots, and feature toggling under a single filtering rule.
date: 2026-05-04
tags:
  - EDA
  - Architecture
  - Kafka
  - API Design
featured: false
featuredImage: assets/articles/2026-05-04-designing-header-family-traffic-segmentation/header-design.png
featuredImageAlt: "Designing a header family for traffic segmentation: the decision process"
readingTime: "5 min read"

draft: true
---

# 2026-04-10-designing-header-family-traffic-segmentation.md

1. The starting point: x-pilot-id and its limitations
2. Why naming matters: headers as contracts, not implementation details
3. From identity to segment: the conceptual shift
4. Unifying canary and pilot under the same mechanism
5. The full family: each header and why it exists
6. What was discarded and why
7. The filtering contract as a consequence of naming
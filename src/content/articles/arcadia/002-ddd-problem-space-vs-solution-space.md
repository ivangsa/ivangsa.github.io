---
title: "DDD Problem Space vs Solution Space"
summary: "The solution space is your business. But only if it needs to be discovered. If it is already known, you are not building a business, you are building a commodity."
date: 2026-05-01
tags:
  - arcadia
  - EDA
  - DDD
  - Governance
featured: false
featuredImage: assets/articles/arcadia-editions/problem-space-vs-solution-space.png
featuredImageAlt: "Event Storming board for the PlaceOrder flow of Arcadia Editions"
readingTime: "3 min read"
draft: false
---

The core idea of DDD is simple: understand the problem space first.

The problem space is your client's problem. Not your architecture. Not your stack. Your client's problem.

You need to discover your client's problem first. Then design a solution. That solution is your business.

If the solution space is already known, you are not building a business. You are building a commodity.

This is not a technical distinction. It is a business one.

Not every piece of your business deserves the same investment.

Some things you do are what make you different. Clients choose you because of them. These are worth every hour of discovery and design.

Other things keep the lights on. Billing, notifications, user accounts. Critical, yes. But not what clients are paying for. A good implementation is enough here.

And some things you should not build at all. Off-the-shelf solves them. Your energy is better spent elsewhere.

DDD calls these core subdomains, supporting subdomains, and generic subdomains. The core is where your competitive advantage lives. Supporting subdomains enable the core but are not unique to you. Generic subdomains are solved problems.

## Arcadia Editions

Arcadia Editions is a specialty retailer of limited-edition board games. I use it as a showcase domain for ZenWave Platform and event-driven architecture.

The problem space: a rare launch goes live. The window is short. 
Collectors have been waiting months for this copy. Trust is the 
business. If the buying experience breaks that trust, they are gone.

We know what we want to deliver. Collectors should feel at home at 
Arcadia Editions. Long-time buyers should feel recognized. Some 
customers might get early access before a launch goes public. Others 
might pre-order weeks in advance. The tiers, the rules, the exact 
flow: we do not know yet.

The solution space is still being discovered. That is the point.

What we do know is that the checkout is not just a transaction. It is 
the moment where Arcadia delivers on its promise or breaks it.

That is a problem worth discovering properly.

## Event Storming is how you discover it

Event Storming puts business experts and technical experts in the same 
room. They talk about the business in business terms. Not APIs. Not 
databases. Not Kubernetes. Just things that happen.

It is a deliberately low-tech workshop with minimal friction so anyone 
can participate. The goal is dialogue. Exploring the business together, 
out loud, before committing to a solution.

When a client places an order, what happens? You start with the obvious. 
The happy path. Stock is available, payment goes through, order is confirmed.

But then the real conversation starts. What if two clients hit the same 
item at the same time? What happens when a pre-order window closes? Do 
long-time buyers get priority? Nobody has written down the answers yet.

These moments of confusion and disagreement are called hot spots in Event 
Storming. You mark them visibly and you keep going. You are not trying to 
resolve them on the spot. You are making them visible.

Hot spots are not problems. They are the business. For Arcadia, the hot 
spots are where the trust gets built or broken. Stock reservation rules, 
early access windows, buyer tiers. That is what we want to deliver. That 
is what we are discovering.

We start with the PlaceOrder flow. A strong happy path: stock 
reservation, payment, confirmation. Not the full vision yet. But a 
real foundation to build on and iterate from there.

This is intentional. Thanks to the discovery work, we know what to 
build now and what to save for later.

In the next post we walk through the full PlaceOrder flow for Arcadia Editions. Sticky notes to bounded contexts.
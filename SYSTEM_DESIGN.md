# System Design Write-Up

## Compatibility Scoring Design

Every tenant-listing pair gets exactly one compatibility score, computed once and cached permanently in a dedicated `CompatibilityScore` collection rather than recalculated on every page view. This was a deliberate choice driven by the assignment's explicit requirement ("score and explanation stored in DB, not recomputed on every request") and by practical cost/latency concerns: LLM calls are slow (seconds) and rate-limited, so computing a score for every listing on every browse request would make the tenant's feed unusably slow and expensive.

The `CompatibilityScore` schema has a unique compound index on `(tenant, listing)`, so a lookup is a simple indexed query. When a tenant requests their ranked listings, the system checks this collection first; only pairs without an existing score trigger a new computation. Once written, a score never changes unless the tenant's profile or the listing itself is meaningfully edited (a future improvement would be to invalidate cached scores on profile/listing updates — not implemented here due to time constraints, but the schema supports it cleanly since scores are keyed by both IDs).

Scores are ranked in-memory after fetching (`Array.sort`) rather than via a MongoDB aggregation pipeline, since dataset sizes for this assignment are small; at production scale this would move to an aggregation with `$lookup` and server-side sorting.

## LLM Integration and Fallback

Compatibility scoring is delegated to Google Gemini (`gemini-2.5-flash`) via a plain REST call — no SDK dependency, keeping the dependency footprint minimal per the assignment's package guidelines. The prompt is deliberately structured to request strict JSON output with no markdown fencing, since LLMs frequently wrap JSON in ` ```json ` blocks; the response is defensively stripped of any such fencing before parsing.

Reliability was the primary design concern here, since LLM calls can fail for many reasons: network timeouts, malformed responses, rate limits, or the API being temporarily down. The integration therefore wraps every LLM call in a try/catch inside a single `computeCompatibility()` function that tenants and other parts of the codebase call — callers never need to know whether a score came from the LLM or the fallback. On any failure, control falls through to a deterministic rule-based scorer that checks exact location match and whether rent falls within the tenant's budget range, producing one of four fixed scores (90/50/40/15) with a corresponding plain-language explanation. Both paths write to the same `CompatibilityScore` schema, with a `source` field (`llm` or `rule-based`) so it's always auditable which method produced a given score. This means the compatibility feature degrades gracefully rather than breaking the tenant's entire browsing experience if Gemini is unreachable — a request timeout is set (8 seconds) specifically so a slow LLM response can't hang the whole ranked-listings endpoint.

## Chat Implementation

Real-time chat is scoped strictly to accepted interest requests: each `InterestRequest` document effectively defines one private chat "room," and Socket.io's built-in room feature (`socket.join(interestRequestId)`) is used directly as the isolation mechanism, so messages are never broadcast beyond the two relevant parties. The system does not allow chat access before an interest is accepted — this is enforced both at the REST layer (`getChatHistory` checks `interest.status === 'accepted'` and that the requester is either the tenant or the listing's owner) and implicitly at the socket layer, since a room ID that was never shared with an unauthorized client can't be joined.

Messages are persisted to MongoDB (`ChatMessage` collection) before being broadcast back to the room, not after — this guarantees that if the broadcast fails for any reason, the message is never lost, and a page refresh (via the `GET /api/chat/:interestRequestId` history endpoint) always reflects the true state of the conversation. This trade-off (write-then-broadcast rather than broadcast-then-write) slightly increases latency per message but was chosen because message loss is a worse failure mode than a few extra milliseconds of delay for a chat feature.

## Notification Flow

Two notification triggers are implemented, both using nodemailer against an SMTP transport (Ethereal for development, swappable to Gmail/SendGrid via one config object). The first fires when a tenant sends an interest request: the system checks the cached compatibility score for that tenant-listing pair, and if it exceeds 80, immediately emails the owner with the tenant's name, score, and the LLM's explanation, so owners can prioritize high-fit tenants without manually reviewing every request. The second fires whenever an owner responds to an interest request (accept or decline), notifying the tenant of the outcome.

Both notifications are fire-and-forget from the main request/response cycle: `sendEmail()` catches its own errors internally and logs them rather than throwing, so a failing SMTP connection never breaks the underlying interest-request or accept/decline API call. This mirrors the same graceful-degradation philosophy used for LLM fallback — a secondary feature (notifications) should never take down a primary one (expressing interest, responding to interest).

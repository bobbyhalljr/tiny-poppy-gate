# tiny-poppy-gate

A tiny Poppy-inspired discovery + session scope gate in TypeScript.

Load a mock `/.well-known/poppy.json`. Start a guest session. Enforce a guest allowlist. Escalate read, then write. Fail closed when scope is missing.

No API key. No network. No real OAuth or JWTs. Mock tokens are plain strings.

**This is a teaching toy inspired by [Personal Agent Protocol (Poppy) draft 0.1](https://personalagentprotocol.org/docs/overview) (updated Oct 9, 2026). It is not an implementation of the protocol.**

## Run

```bash
npm install
npx tsx gate.ts
```

Typecheck:

```bash
npx tsc --noEmit
```

## What it does

1. Publishes a simplified discovery document (company id, channels, guestAllowed, scopes, signIn)
2. Starts a guest session where the personal agent identifies itself (`agentId` + stable `userPseudonym`)
3. Allows guest actions on the allowlist (`checkStock`, `returnsPolicy`)
4. Denies `placeOrder` and `seeOrders` until the user approves higher scopes
5. Escalates to `read`, then `write`, then revokes back to guest
6. Prints a clear allow/deny timeline

Company names, SKUs, and order numbers in the output are **example inputs**.

## Write-up

- Draft slug: `personal-agent-protocol-discovery`
- Primary sources: [Sierra Oct 9 draft post](https://sierra.ai/blog/poppy), [Poppy overview](https://personalagentprotocol.org/docs/overview)

## License

MIT

// gate.ts: a tiny Poppy-inspired discovery + session scope gate.
// Textbook toy inspired by Personal Agent Protocol draft 0.1 (Oct 9, 2026).
// NOT an implementation of the real protocol. No OAuth. No JWTs. No network.
// Mock session tokens are plain strings. Example company and actions only.
// Run: npx tsx gate.ts

type Channel = "website" | "api" | "agent";
type Scope = "guest" | "read" | "write";
type SignInMethod = "oauth";

type DiscoveryDocument = {
  /** Simplified shape inspired by /.well-known/poppy.json */
  companyId: string;
  companyName: string;
  channels: Channel[];
  guestAllowed: string[];
  scopes: Scope[];
  signIn: SignInMethod[];
};

type PersonalAgent = {
  agentId: string;
  /** Stable non-PII ID for this user at this company (toy: a fixed string). */
  userPseudonym: string;
};

type Session = {
  token: string;
  companyId: string;
  agentId: string;
  userPseudonym: string;
  scope: Scope;
  createdAt: string;
};

type Decision = "allow" | "deny";

type TimelineEntry = {
  at: string;
  action: string;
  scope: Scope;
  decision: Decision;
  reason: string;
  result?: string;
};

const SCOPE_RANK: Record<Scope, number> = {
  guest: 0,
  read: 1,
  write: 2,
};

/** Action → minimum scope required (beyond the guest allowlist). */
const ACTION_SCOPE: Record<string, Scope> = {
  checkStock: "guest",
  returnsPolicy: "guest",
  seeOrders: "read",
  placeOrder: "write",
  changePayment: "write",
};

const discovery: DiscoveryDocument = {
  companyId: "acme-retail",
  companyName: "Acme Retail (example company)",
  channels: ["website", "api", "agent"],
  guestAllowed: ["checkStock", "returnsPolicy"],
  scopes: ["guest", "read", "write"],
  signIn: ["oauth"],
};

const agent: PersonalAgent = {
  agentId: "muse-like-agent-example",
  // Different per company in a real protocol. Fixed here for the demo.
  userPseudonym: "usr_acme_7f3a9c",
};

const timeline: TimelineEntry[] = [];
let clock = 0;

function now(): string {
  clock += 1;
  const m = String(Math.floor(clock / 60)).padStart(2, "0");
  const s = String(clock % 60).padStart(2, "0");
  return `12:${m}:${s}`;
}

function log(
  action: string,
  scope: Scope,
  decision: Decision,
  reason: string,
  result?: string,
) {
  const entry: TimelineEntry = {
    at: now(),
    action,
    scope,
    decision,
    reason,
    result,
  };
  timeline.push(entry);
  const mark = decision === "allow" ? "ALLOW" : "DENY ";
  const extra = result ? ` -> ${result}` : "";
  console.log(
    `${entry.at}  ${mark}  scope=${scope.padEnd(5)}  ${action}${extra}`,
  );
  console.log(`         reason: ${reason}`);
}

function loadDiscovery(): DiscoveryDocument {
  // In a real Poppy flow this would be fetched from /.well-known/poppy.json
  console.log("Discovery");
  console.log(`  GET https://acme.example/.well-known/poppy.json`);
  console.log(`  company: ${discovery.companyName}`);
  console.log(`  channels: ${discovery.channels.join(", ")}`);
  console.log(`  guestAllowed: ${discovery.guestAllowed.join(", ")}`);
  console.log(`  scopes: ${discovery.scopes.join(", ")}`);
  console.log(`  signIn: ${discovery.signIn.join(", ")}`);
  console.log("");
  return discovery;
}

function startGuestSession(doc: DiscoveryDocument, a: PersonalAgent): Session {
  // Mock token only. Not a JWT. Not OAuth.
  const session: Session = {
    token: `sess_guest_${a.userPseudonym}_${Date.now()}`,
    companyId: doc.companyId,
    agentId: a.agentId,
    userPseudonym: a.userPseudonym,
    scope: "guest",
    createdAt: now(),
  };
  console.log("Session started (guest)");
  console.log(`  agentId: ${session.agentId}`);
  console.log(`  userPseudonym: ${session.userPseudonym}`);
  console.log(`  token: ${session.token} (mock string, not a JWT)`);
  console.log(`  scope: ${session.scope}`);
  console.log("");
  return session;
}

function hasMinScope(current: Scope, required: Scope): boolean {
  return SCOPE_RANK[current] >= SCOPE_RANK[required];
}

function attempt(
  session: Session,
  doc: DiscoveryDocument,
  action: string,
  runner: () => string,
): string | null {
  const required = ACTION_SCOPE[action];
  if (!required) {
    log(action, session.scope, "deny", "unknown action; fail closed");
    return null;
  }

  // Guest path: only the published allowlist, and only when still at guest.
  if (session.scope === "guest") {
    if (!doc.guestAllowed.includes(action)) {
      log(
        action,
        session.scope,
        "deny",
        `not on guestAllowed [${doc.guestAllowed.join(", ")}]`,
      );
      return null;
    }
  }

  if (!hasMinScope(session.scope, required)) {
    log(
      action,
      session.scope,
      "deny",
      `needs scope=${required}; current=${session.scope}`,
    );
    return null;
  }

  const result = runner();
  log(action, session.scope, "allow", `min scope ${required} satisfied`, result);
  return result;
}

/**
 * Toy stand-in for "user Approves" after OAuth on the company page.
 * Real Poppy uses OAuth + scoped tokens. Here we just bump the scope.
 */
function userApproves(session: Session, next: Scope): Session {
  if (!discovery.scopes.includes(next)) {
    throw new Error(`company does not offer scope=${next}`);
  }
  if (SCOPE_RANK[next] < SCOPE_RANK[session.scope]) {
    console.log(
      `Approve skipped: already at ${session.scope}, requested ${next}`,
    );
    return session;
  }
  const updated: Session = {
    ...session,
    scope: next,
    token: `sess_${next}_${session.userPseudonym}_${Date.now()}`,
  };
  console.log("");
  console.log(`User approved scope=${next} (mocked OAuth / consent)`);
  console.log(`  new token: ${updated.token} (mock string)`);
  console.log("");
  return updated;
}

function revokeToGuest(session: Session): Session {
  const updated: Session = {
    ...session,
    scope: "guest",
    token: `sess_guest_${session.userPseudonym}_${Date.now()}`,
  };
  console.log("");
  console.log("Scope revoked to guest (fail closed after revoke)");
  console.log(`  new token: ${updated.token} (mock string)`);
  console.log("");
  return updated;
}

// --- mock company backends (example data only) ---

function checkStock(): string {
  return "SKU-1001 in stock: 14 (example)";
}

function returnsPolicy(): string {
  return "30-day returns with receipt (example)";
}

function seeOrders(): string {
  return "2 open orders: #4812, #4819 (example)";
}

function placeOrder(): string {
  return "order #4820 placed for SKU-1001 (example)";
}

function changePayment(): string {
  return "payment method updated (example)";
}

function printTimeline() {
  console.log("");
  console.log("Decision timeline");
  console.log("-".repeat(72));
  for (const e of timeline) {
    const mark = e.decision === "allow" ? "ALLOW" : "DENY ";
    console.log(
      `${e.at}  ${mark}  [${e.scope}]  ${e.action}  |  ${e.reason}`,
    );
  }
  const allowed = timeline.filter((e) => e.decision === "allow").length;
  const denied = timeline.filter((e) => e.decision === "deny").length;
  console.log("-".repeat(72));
  console.log(`allowed=${allowed}  denied=${denied}  total=${timeline.length}`);
}

function main() {
  console.log("tiny-poppy-gate");
  console.log(
    "Inspired by Personal Agent Protocol (Poppy) draft 0.1, Oct 9, 2026.",
  );
  console.log(
    "This is a teaching toy. Not the real protocol. Not production security.",
  );
  console.log("");

  const doc = loadDiscovery();
  let session = startGuestSession(doc, agent);

  console.log("Actions");
  console.log("");

  // Guest can check stock and returns policy.
  attempt(session, doc, "checkStock", checkStock);
  attempt(session, doc, "returnsPolicy", returnsPolicy);

  // Guest cannot place an order or see account orders.
  attempt(session, doc, "placeOrder", placeOrder);
  attempt(session, doc, "seeOrders", seeOrders);

  // Escalate: user Approves read.
  session = userApproves(session, "read");
  attempt(session, doc, "seeOrders", seeOrders);
  attempt(session, doc, "placeOrder", placeOrder); // still deny: needs write

  // Escalate: user Approves write.
  session = userApproves(session, "write");
  attempt(session, doc, "placeOrder", placeOrder);
  attempt(session, doc, "changePayment", changePayment);

  // Revoke: missing write scope fails closed.
  session = revokeToGuest(session);
  attempt(session, doc, "placeOrder", placeOrder);
  attempt(session, doc, "seeOrders", seeOrders);
  attempt(session, doc, "checkStock", checkStock); // guest allowlist still works

  printTimeline();
}

main();

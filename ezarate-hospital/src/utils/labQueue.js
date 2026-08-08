// Lab Orders queueing system.
//
// The unit of work here is a single diagnostic test, not a whole order —
// one lab order can contain a CBC (Laboratory) and a Chest X-Ray (X-Ray)
// at once, and those belong to two different techs' queues. So this reads
// every order, flattens out each of its still-pending diagnostics, and
// filters by which request-slip type (see FORM_TYPE_BY_TEST in
// utils/labOrders.js) the given role is responsible for.
//
// Storage stays inside the existing lab order record — each test gets a
// `queueStatus` of "WAITING" or "SERVING" (see emptyTestRecord in
// utils/labOrderDiagnostics.js) that's independent of its clinical
// `status` (PENDING/DONE/CANCELLED). Once a test's status leaves PENDING
// it naturally drops out of the queue.

import { loadLabOrders, updateLabOrder, FORM_TYPE_BY_TEST } from "./labOrders";
import { emptyTestRecord } from "./labOrderDiagnostics";

// Which request-slip formTypes each role's queue pulls from.
export const ROLE_QUEUE_TYPES = {
  med_tech: ["Laboratory"],
  xray_tech: ["X-Ray", "Ultrasound & Imaging"],
};

export const QUEUE_TYPE_LABELS = {
  Laboratory: "Laboratory Queue",
  "X-Ray": "Imaging Queue",
  "Ultrasound & Imaging": "Imaging Queue",
};

// The queue type (not role) a person actually looks at — lets anyone with
// Lab Orders access switch between the two queues regardless of their own
// role, while still defaulting to the queue that matches their role.
export function defaultQueueGroup(role) {
  return role === "xray_tech" ? "Imaging" : "Laboratory";
}

const QUEUE_GROUPS = {
  Laboratory: ["Laboratory"],
  Imaging: ["X-Ray", "Ultrasound & Imaging"],
};

// Every still-pending diagnostic test belonging to the given queue group
// ("Laboratory" or "Imaging"), oldest order first — that ordering *is* the
// line: position 0 is next, regardless of who's marked "SERVING".
export async function getQueueEntries(group) {
  const formTypes = QUEUE_GROUPS[group] || [];
  const orders = await loadLabOrders();
  const entries = [];

  orders.forEach((order) => {
    (order.diagnostics || []).forEach((diagnosticName) => {
      if (!formTypes.includes(FORM_TYPE_BY_TEST[diagnosticName])) return;

      // CreateLabOrderModal now creates every test record up front, but
      // orders saved before that fix (or any other edge case) may not have
      // one yet — treat "no record" as "still pending, still waiting"
      // instead of silently dropping it from the queue. ViewLabOrderPage
      // will materialize the real record with the right code the first
      // time anyone opens the order; the queue doesn't need to wait for
      // that to happen first.
      const test = order.tests?.[diagnosticName];
      if (test && test.status !== "PENDING") return;

      entries.push({
        orderId: order.id,
        diagnosticName,
        code: test?.code || null,
        queueStatus: test?.queueStatus || "WAITING",
        patient: order.patient,
        hospitalNo: order.hospitalNo,
        dateCreated: order.dateCreated,
      });
    });
  });

  entries.sort((a, b) => new Date(a.dateCreated) - new Date(b.dateCreated));
  return entries;
}

export async function setQueueStatus(orderId, diagnosticName, queueStatus) {
  return updateLabOrder(orderId, (o) => {
    const existing = o.tests?.[diagnosticName];
    // Fallback code is a placeholder ("LAB-pending") rather than an actual
    // generated code — generateDiagnosticCode is async now and this
    // updater callback must stay synchronous, so real code assignment
    // stays where it already happens (CreateLabOrderModal, or
    // ViewLabOrderPage's ensureTestRecords) rather than here.
    const base = existing || emptyTestRecord(null);
    return {
      ...o,
      tests: {
        ...o.tests,
        [diagnosticName]: { ...base, queueStatus },
      },
    };
  });
}

// Demotes whoever's currently being served back to waiting, then pulls the
// oldest waiting entry to the front. Only one "now serving" per queue group
// at a time — this is what "call next" does.
export async function callNext(group) {
  const entries = await getQueueEntries(group);
  const currentlyServing = entries.find((e) => e.queueStatus === "SERVING");
  if (currentlyServing) {
    await setQueueStatus(currentlyServing.orderId, currentlyServing.diagnosticName, "WAITING");
  }

  const refreshed = currentlyServing ? await getQueueEntries(group) : entries;
  const next = refreshed.find((e) => e.queueStatus === "WAITING");
  if (next) await setQueueStatus(next.orderId, next.diagnosticName, "SERVING");
  return next || null;
}

export async function returnToQueue(orderId, diagnosticName) {
  return setQueueStatus(orderId, diagnosticName, "WAITING");
}

// "2026-07-06T09:15:00.000Z" -> "12 min" / "1 hr 4 min" — how long an
// entry has been waiting.
export function formatWaitTime(iso) {
  if (!iso) return "—";
  const created = new Date(iso).getTime();
  if (Number.isNaN(created)) return "—";
  const minutes = Math.max(0, Math.floor((Date.now() - created) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem ? `${hrs} hr ${rem} min` : `${hrs} hr`;
}
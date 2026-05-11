// Owner-notification helper backed by Resend (transactional email).
// Public surface (`notifyOwner`, `NotificationPayload`) is preserved so callers
// continue to work; the dispatch channel changes from Manus push to email.
//
// Required env: RESEND_API_KEY, NOTIFY_FROM_EMAIL, NOTIFY_OWNER_EMAIL

import { TRPCError } from "@trpc/server";
import { Resend } from "resend";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

let _resend: Resend | null = null;

function getResend(): Resend {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "RESEND_API_KEY is not configured.",
    });
  }
  _resend = new Resend(key);
  return _resend;
}

function validatePayload(input: NotificationPayload): NotificationPayload {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Notification title is required." });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Notification content is required." });
  }

  const title = input.title.trim();
  const content = input.content.trim();

  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`,
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`,
    });
  }

  return { title, content };
}

/**
 * Dispatches an owner notification as an email via Resend.
 * Returns `true` when the email is accepted, `false` on transient delivery
 * errors. Validation errors bubble up as TRPC errors.
 */
export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  const { title, content } = validatePayload(payload);

  const from = process.env.NOTIFY_FROM_EMAIL;
  const to = process.env.NOTIFY_OWNER_EMAIL;

  if (!from || !to) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "NOTIFY_FROM_EMAIL and NOTIFY_OWNER_EMAIL must be configured.",
    });
  }

  try {
    const { error } = await getResend().emails.send({
      from,
      to,
      subject: title,
      text: content,
    });

    if (error) {
      console.warn("[Notification] Resend rejected email:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error sending email via Resend:", error);
    return false;
  }
}

/* ==========================================================================
   Sikhify API — lib/mailer.js
   Sends transactional email (password resets) through Resend's HTTP API when
   RESEND_API_KEY and MAIL_FROM are set. Without them:
   • development: the message (including the reset link) is printed to the
     server console so the flow can be tested locally;
   • production: nothing is sent and a warning is logged — an admin can still
     issue a reset link from /admin/users.
   ========================================================================== */

export function createMailer(config, log = console) {
  const configured = !!(config.resendApiKey && config.mailFrom);
  return {
    configured,
    async send({ to, subject, text }) {
      if (!configured) {
        if (config.production) {
          log.warn(`[mail] Email is not configured (RESEND_API_KEY / MAIL_FROM); "${subject}" to ${to} was not sent.`);
        } else {
          log.info(`\n[mail:dev] To: ${to}\n[mail:dev] Subject: ${subject}\n${text}\n`);
        }
        return { sent: false };
      }
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: config.mailFrom, to: [to], subject, text }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        log.error(`[mail] Resend responded ${res.status} for "${subject}"`);
        return { sent: false };
      }
      return { sent: true };
    },
  };
}

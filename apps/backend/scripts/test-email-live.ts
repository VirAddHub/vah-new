/* eslint-disable no-console */
import postmark from "postmark";

const {
  POSTMARK_TOKEN = "",
  POSTMARK_STREAM = "outbound",
  EMAIL_FROM = "hello@virtualaddresshub.co.uk",
  EMAIL_FROM_NAME = "VirtualAddressHub",
  EMAIL_REPLY_TO = "support@virtualaddresshub.co.uk",
  APP_BASE_URL = "https://vah-new-frontend-75d6.vercel.app",
  ALLOW_LIVE_EMAIL = "0",
} = process.env;

async function main() {
  const [recipient = "", nameArg = "Test User"] = process.argv.slice(2);

  if (ALLOW_LIVE_EMAIL !== "1") {
    console.log("Refusing to send: set ALLOW_LIVE_EMAIL=1 to enable live send.");
    process.exit(0);
  }

  if (!POSTMARK_TOKEN) {
    console.error("Missing POSTMARK_TOKEN.");
    process.exit(1);
  }

  if (!recipient) {
    console.error("Usage: npm run email:live -- you@virtualaddresshub.co.uk \"Your Name\"");
    process.exit(1);
  }

  if (!/@virtualaddresshub\.co\.uk$/i.test(recipient)) {
    console.error("Recipient must be an @virtualaddresshub.co.uk address (Postmark basic plan safeguard).");
    process.exit(1);
  }

  const client = new postmark.ServerClient(POSTMARK_TOKEN);
  const From = `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`;
  const action_url = `${APP_BASE_URL}/billing#payment`;

  try {
    const res = await client.sendEmailWithTemplate({
      TemplateAlias: "billing-reminder",
      MessageStream: POSTMARK_STREAM,
      From,
      To: recipient,
      ReplyTo: EMAIL_REPLY_TO,
      TemplateModel: {
        name: nameArg,
        action_url,
      },
    });

    console.log("Sent OK:", { MessageID: res.MessageID, To: recipient });
  } catch (err: any) {
    console.error("Send failed:", err?.message || err);
    process.exit(1);
  }
}

main();

/**
 * Builds Kitloom's Supabase Auth email templates from one shared layout.
 *
 *   node scripts/emails/build.mjs   →  supabase/templates/*.html
 *
 * Email clients ignore most modern CSS, so the layout is tables with inline styles only,
 * no images (many inboxes block them) and no web fonts. Colours are the site's design
 * tokens (design.md §2). `{{ .X }}` placeholders are filled in by Supabase.
 */
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = new URL("../../supabase/templates/", import.meta.url);

const C = {
  carbon: "#111318",
  surface: "#1b1e25",
  line: "#343944",
  lineSubtle: "#282c35",
  lime: "#d9ff72",
  fg: "#f2f3f5",
  fg2: "#a7abb5",
  fg3: "#777e8a",
};
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";

const button = (href, label) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
  <tr>
    <td bgcolor="${C.lime}" style="background:${C.lime};border-radius:2px;">
      <a href="${href}" target="_blank" style="display:inline-block;padding:13px 22px;font-family:${SANS};font-size:15px;font-weight:600;line-height:1;color:${C.carbon};text-decoration:none;border-radius:2px;">${label}&nbsp;&rarr;</a>
    </td>
  </tr>
</table>`;

const fallback = (href) => `
<p style="margin:18px 0 0;font-family:${SANS};font-size:12px;line-height:1.6;color:${C.fg3};">
  If the button does not work, copy this address into your browser:<br>
  <a href="${href}" target="_blank" style="color:${C.fg2};text-decoration:underline;word-break:break-all;">${href}</a>
</p>`;

const code = (token) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 6px;">
  <tr>
    <td bgcolor="${C.surface}" style="background:${C.surface};border:1px solid ${C.line};border-left:2px solid ${C.lime};padding:16px 22px;">
      <span style="font-family:${MONO};font-size:28px;font-weight:600;letter-spacing:6px;color:${C.fg};">${token}</span>
    </td>
  </tr>
</table>`;

const note = (text) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;">
  <tr>
    <td style="border-top:1px solid ${C.lineSubtle};padding-top:18px;font-family:${SANS};font-size:13px;line-height:1.6;color:${C.fg2};">${text}</td>
  </tr>
</table>`;

function layout({ subject, preheader, eyebrow, title, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:${C.carbon};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;">${preheader}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.carbon}" style="background:${C.carbon};">
  <tr>
    <td align="center" style="padding:36px 16px 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;">

        <!-- Wordmark: a lime knot and the name, as on the site -->
        <tr>
          <td style="padding:0 2px 18px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="10" valign="middle" style="width:10px;font-size:0;line-height:0;"><div style="width:10px;height:10px;background:${C.lime};font-size:0;line-height:0;">&nbsp;</div></td>
                <td style="padding-left:10px;font-family:${SANS};font-size:17px;font-weight:700;letter-spacing:-0.3px;color:${C.fg};">kitloom</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td bgcolor="${C.carbon}" style="background:${C.carbon};border:1px solid ${C.line};">
            <!-- The thread: a lime run that continues as a quiet line -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="96" height="2" bgcolor="${C.lime}" style="width:96px;height:2px;background:${C.lime};font-size:0;line-height:0;">&nbsp;</td>
                <td height="2" bgcolor="${C.line}" style="height:2px;background:${C.line};font-size:0;line-height:0;">&nbsp;</td>
              </tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:30px 32px 32px;">
                  <p style="margin:0;font-family:${MONO};font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:${C.lime};">${eyebrow}</p>
                  <h1 style="margin:10px 0 0;font-family:${SANS};font-size:24px;line-height:1.25;font-weight:600;letter-spacing:-0.4px;color:${C.fg};">${title}</h1>
                  ${body}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 2px 0;font-family:${SANS};font-size:12px;line-height:1.7;color:${C.fg3};">
            Kitloom &middot; AI coding-agent setups you can inspect and download.<br>
            <a href="{{ .SiteURL }}" target="_blank" style="color:${C.fg2};text-decoration:none;">{{ .SiteURL }}</a>
            &nbsp;&middot;&nbsp; This is an automatic account email; replies are not read.
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>
`;
}

const p = (html) => `<p style="margin:14px 0 0;font-family:${SANS};font-size:15px;line-height:1.65;color:${C.fg2};">${html}</p>`;
const strong = (html) => `<span style="color:${C.fg};font-weight:600;">${html}</span>`;
const mono = (html) => `<span style="font-family:${MONO};font-size:14px;color:${C.fg};">${html}</span>`;

const TEMPLATES = [
  {
    file: "confirm-signup.html",
    dashboard: "Confirm sign up",
    subject: "Confirm your Kitloom account",
    preheader: "One click to finish creating your account.",
    eyebrow: "Confirm your email",
    title: "Finish creating your Kitloom account",
    body:
      p(`Someone, hopefully you, created a Kitloom account with ${strong("{{ .Email }}")}. Confirm the address to finish, then sign in with your email and password.`) +
      button("{{ .ConfirmationURL }}", "Confirm my email") +
      fallback("{{ .ConfirmationURL }}") +
      note("Open the link on the same device and browser you signed up from. If you did not create an account, ignore this email: nothing happens until the link is opened."),
  },
  {
    file: "invite.html",
    dashboard: "Invite user",
    subject: "You are invited to Kitloom",
    preheader: "Accept the invitation to publish and manage agent setups.",
    eyebrow: "Invitation",
    title: "You have been invited to Kitloom",
    body:
      p("Kitloom is a directory of AI coding-agent setups — instructions, rules, skills and commands for Claude Code, Codex, Cursor, Antigravity and more — that you can inspect before you download.") +
      p(`Accept the invitation to create your account for ${strong("{{ .Email }}")}. You can then publish your own setups and set a password from your account page.`) +
      button("{{ .ConfirmationURL }}", "Accept the invitation") +
      fallback("{{ .ConfirmationURL }}") +
      note("If you were not expecting this invitation, ignore this email. No account is created unless you accept."),
  },
  {
    file: "magic-link.html",
    dashboard: "Magic link or OTP",
    subject: "Your Kitloom sign-in link",
    preheader: "Sign in with one click. The link works once.",
    eyebrow: "Sign in",
    title: "Your one-time sign-in link",
    body:
      p(`Use this link to sign in to Kitloom as ${strong("{{ .Email }}")}. No password needed.`) +
      button("{{ .ConfirmationURL }}", "Sign in to Kitloom") +
      fallback("{{ .ConfirmationURL }}") +
      note("The link works once and expires after a short time. Open it in the browser you requested it from. If you did not ask to sign in, ignore this email: your account stays as it is."),
  },
  {
    file: "change-email.html",
    dashboard: "Change email address",
    subject: "Confirm your new email address",
    preheader: "Confirm the change to your Kitloom sign-in email.",
    eyebrow: "Email change",
    title: "Confirm your new email address",
    body:
      p(`Your Kitloom account is changing its sign-in email from ${mono("{{ .Email }}")} to ${mono("{{ .NewEmail }}")}.`) +
      p("Confirm to finish the change. Your setups, profile and display name stay the same.") +
      button("{{ .ConfirmationURL }}", "Confirm the new address") +
      fallback("{{ .ConfirmationURL }}") +
      note(`If you did not ask for this change, do not open the link. Sign in and set a new password from your account page, because someone may have access to your account.`),
  },
  {
    file: "reset-password.html",
    dashboard: "Reset password",
    subject: "Reset your Kitloom password",
    preheader: "Choose a new password. The link works once.",
    eyebrow: "Password reset",
    title: "Choose a new password",
    body:
      p(`Someone asked to reset the password for ${strong("{{ .Email }}")}. Open the link to choose a new one on your account page.`) +
      button("{{ .ConfirmationURL }}", "Choose a new password") +
      fallback("{{ .ConfirmationURL }}") +
      note("The link works once and expires after a short time. If you did not ask for a reset, ignore this email: your current password keeps working."),
  },
  {
    file: "reauthentication.html",
    dashboard: "Reauthentication",
    subject: "Your Kitloom verification code",
    preheader: "Enter this code to confirm it is you.",
    eyebrow: "Verify it is you",
    title: "Your verification code",
    body:
      p("Enter this code in Kitloom to confirm a sensitive change, such as a new password.") +
      code("{{ .Token }}") +
      note("The code expires after a short time. Never share it: Kitloom will never ask you for it by email, chat or phone. If you did not request it, change your password from your account page."),
  },
];

mkdirSync(OUT, { recursive: true });
const index = [];
for (const t of TEMPLATES) {
  writeFileSync(new URL(t.file, OUT), layout(t));
  index.push(`| ${t.dashboard} | \`${t.subject}\` | \`${t.file}\` |`);
}
writeFileSync(
  new URL("README.md", OUT),
  `# Supabase Auth email templates

Generated by \`node scripts/emails/build.mjs\` from one shared layout. Edit the script, not
the HTML files, then rebuild.

To install: Supabase dashboard → **Authentication → Emails → Templates**. For each row,
open the template, set the subject, paste the whole HTML file into the body, and save.

| Dashboard template | Subject | File |
|---|---|---|
${index.join("\n")}

The placeholders (\`{{ .ConfirmationURL }}\`, \`{{ .Email }}\`, \`{{ .NewEmail }}\`, \`{{ .Token }}\`,
\`{{ .SiteURL }}\`) are filled in by Supabase. \`{{ .SiteURL }}\` is the **Site URL** in
Authentication → URL Configuration.

Design: dark card on carbon, the lime "knot" wordmark, a lime thread rule, one lime action
button, the link written out in case the button does not render, and a safety note. Tables
and inline styles only, no images, no web fonts, so it renders in Gmail, Outlook and Apple
Mail. Clients that force a light theme may invert colours; the content stays readable.
`,
);
console.log(`${TEMPLATES.length} templates → supabase/templates/`);

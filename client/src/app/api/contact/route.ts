import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const firstName = String(body?.firstName || "").trim();
    const lastName = String(body?.lastName || "").trim();
    const email = String(body?.email || "").trim();
    const subject = String(body?.subject || "New Contact Message").trim();
    const message = String(body?.message || "").trim();

    if (!firstName || !lastName || !email || !message) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const host = process.env.SMTP_HOST || "";
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER || "";
    const pass = process.env.SMTP_PASSWORD || "";
    const from = process.env.SMTP_USER || user;
    const to = process.env.SMTP_TO || user;
    const secure =
      process.env.SMTP_SECURE === "true" || String(port) === "465";

    if (!host || !user || !pass || !from || !to) {
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    const fullName = `${firstName} ${lastName}`.trim();
    const mailSubject = subject || "New Contact Message";
    const text = `From: ${fullName} <${email}>\nSubject: ${mailSubject}\n\n${message}`;
    const html = `<div>
      <p><strong>From:</strong> ${fullName} &lt;${email}&gt;</p>
      <p><strong>Subject:</strong> ${mailSubject}</p>
      <p>${message.replace(/\n/g, "<br/>")}</p>
    </div>`;

    await transporter.sendMail({
      from,
      to,
      replyTo: email,
      subject: mailSubject,
      text,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}


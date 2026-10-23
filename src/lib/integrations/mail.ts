import net from "node:net";
import tls from "node:tls";

import type { SystemSettings } from "@/lib/settings";

export type MailMessage = {
  to: string[];
  subject: string;
  text: string;
  html?: string;
};

function encodeSubject(subject: string) {
  return `=?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`;
}

export async function sendMail(mail: SystemSettings["mail"], message: MailMessage) {
  if (!mail.enabled) return;
  if (!mail.host) throw new Error("SMTP sunucu adresi boş.");
  const recipients = message.to.filter(Boolean);
  if (!recipients.length) return;
  const from = mail.from || mail.user;
  if (!from) throw new Error("Gönderen adresi boş.");
  const fromHeader = mail.fromName ? `"${mail.fromName}" <${from}>` : from;
  const boundary = `bt=${Date.now().toString(16)}`;
  const headers = [
    `From: ${fromHeader}`,
    `To: ${recipients.join(", ")}`,
    `Subject: ${encodeSubject(message.subject)}`,
    "MIME-Version: 1.0",
  ];
  const body = message.html
    ? [
        ...headers,
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        "",
        `--${boundary}`,
        "Content-Type: text/plain; charset=UTF-8",
        "",
        message.text,
        `--${boundary}`,
        "Content-Type: text/html; charset=UTF-8",
        "",
        message.html,
        `--${boundary}--`,
        "",
      ]
    : [...headers, "Content-Type: text/plain; charset=UTF-8", "", message.text, ""];
  const data = body.join("\r\n");

  const port = mail.port || (mail.secure === "SSL" ? 465 : 587);
  if (mail.secure === "SSL") {
    await smtpSession(tls.connect({ host: mail.host, port, timeout: 8000, rejectUnauthorized: false }), mail, from, recipients, data);
    return;
  }
  const socket = net.connect({ host: mail.host, port });
  await smtpSession(socket, mail, from, recipients, data, mail.secure === "STARTTLS");
}

function smtpSession(
  socket: net.Socket,
  mail: SystemSettings["mail"],
  from: string,
  recipients: string[],
  data: string,
  upgradeTls = false,
) {
  return new Promise<void>((resolve, reject) => {
    let buffer = "";
    let step = 0;
    let secured = socket instanceof tls.TLSSocket;
    const host = mail.host;
    const lines = () => {
      const parts = buffer.split("\r\n");
      buffer = parts.pop() ?? "";
      return parts.filter(Boolean);
    };
    const write = (command: string) => socket.write(`${command}\r\n`);
    const finish = (error?: Error) => {
      socket.removeAllListeners();
      socket.end();
      if (error) reject(error);
      else resolve();
    };
    const fail = (line: string) => finish(new Error(`SMTP: ${line}`));

    const advance = (code: string) => {
      if (step === 0 && code.startsWith("220")) {
        step = 1;
        write(`EHLO ${host}`);
        return;
      }
      if (step === 1 && code.startsWith("250")) {
        if (upgradeTls && !secured) {
          step = 2;
          write("STARTTLS");
          return;
        }
        if (mail.user) {
          step = 3;
          write("AUTH LOGIN");
          return;
        }
        step = 5;
        write(`MAIL FROM:<${from}>`);
        return;
      }
      if (step === 2 && code.startsWith("220")) {
        const plain = socket;
        const upgraded = tls.connect({ socket: plain, host, rejectUnauthorized: false }, () => {
          secured = true;
          step = 1;
          upgraded.write(`EHLO ${host}\r\n`);
        });
        attach(upgraded);
        return;
      }
      if (step === 3 && code.startsWith("334")) {
        step = 4;
        write(Buffer.from(mail.user).toString("base64"));
        return;
      }
      if (step === 4 && code.startsWith("334")) {
        step = 5;
        write(Buffer.from(mail.password).toString("base64"));
        return;
      }
      if (step === 4 && code.startsWith("235")) {
        step = 5;
        write(`MAIL FROM:<${from}>`);
        return;
      }
      if (step === 5 && (code.startsWith("235") || code.startsWith("250"))) {
        if (code.startsWith("235")) {
          write(`MAIL FROM:<${from}>`);
          return;
        }
        step = 6;
        write(`RCPT TO:<${recipients[0]}>`);
        recipients.slice(1).forEach((to) => write(`RCPT TO:<${to}>`));
        return;
      }
      if (step === 6 && code.startsWith("250")) {
        step = 7;
        write("DATA");
        return;
      }
      if (step === 7 && code.startsWith("354")) {
        step = 8;
        socket.write(`${data}\r\n.\r\n`);
        return;
      }
      if (step === 8 && code.startsWith("250")) {
        write("QUIT");
        finish();
      }
    };

    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      for (const line of lines()) {
        const code = line.slice(0, 3);
        if (line[3] === "-") continue;
        if (code.startsWith("4") || code.startsWith("5")) {
          fail(line);
          return;
        }
        try {
          advance(code);
        } catch (error) {
          finish(error instanceof Error ? error : new Error("SMTP oturumu başarısız."));
        }
      }
    };

    function attach(target: net.Socket) {
      socket = target;
      target.setTimeout(8000, () => finish(new Error("SMTP zaman aşımı.")));
      target.on("data", onData);
      target.on("error", (error) => finish(error));
    }

    attach(socket);
  });
}

export async function probeSmtp(mail: SystemSettings["mail"]) {
  if (!mail.host) throw new Error("SMTP sunucu adresi boş.");
  const port = mail.port || (mail.secure === "SSL" ? 465 : 587);
  await new Promise<void>((resolve, reject) => {
    const socket =
      mail.secure === "SSL"
        ? tls.connect({ host: mail.host, port, timeout: 5000, rejectUnauthorized: false }, () => {
            socket.end();
            resolve();
          })
        : net.connect({ host: mail.host, port }, () => {
            socket.end();
            resolve();
          });
    socket.setTimeout(5000, () => {
      socket.destroy();
      reject(new Error("SMTP bağlantısı zaman aşımına uğradı."));
    });
    socket.on("error", (error) => reject(error));
  });
  return `SMTP sunucusuna erişildi (${mail.host}:${port}).`;
}

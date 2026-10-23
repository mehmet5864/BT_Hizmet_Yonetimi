import dgram from "node:dgram";
import { hostname } from "node:os";
import net from "node:net";
import tls from "node:tls";

import { isIpAddress, tlsVerifyOptions } from "@/lib/integrations/net";
import type { SystemSettings } from "@/lib/settings";

export type CefEvent = {
  signatureId: string;
  name: string;
  severity: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  extensions: Record<string, string | number | undefined>;
};

function escapeCef(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("|", "\\|").replaceAll("=", "\\=").replaceAll("\n", " ");
}

function escapeSyslog(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("]", " ").replaceAll("\n", " ");
}

function syslogSeverity(severity: number) {
  if (severity >= 10) return 1;
  if (severity >= 9) return 2;
  if (severity >= 7) return 3;
  if (severity >= 6) return 4;
  if (severity >= 5) return 5;
  if (severity >= 3) return 6;
  return 7;
}

export function formatCef(siem: SystemSettings["siem"], event: CefEvent) {
  const ext = Object.entries(event.extensions)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}=${escapeCef(String(value))}`)
    .join(" ");
  return `CEF:0|${escapeCef(siem.cefVendor)}|${escapeCef(siem.cefProduct)}|${escapeCef(siem.cefVersion)}|${escapeCef(event.signatureId)}|${escapeCef(event.name)}|${event.severity}|${ext}`;
}

export function formatSyslog(siem: SystemSettings["siem"], event: CefEvent) {
  const facility = Number.isFinite(siem.syslogFacility) ? siem.syslogFacility : 16;
  const pri = facility * 8 + syslogSeverity(event.severity);
  const app = (siem.syslogAppName || "BTHizmetYonetimi").replaceAll(" ", "");
  const host = hostname() || "localhost";
  const stamp = new Date().toISOString();
  const pairs = Object.entries(event.extensions)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}="${escapeSyslog(String(value))}"`)
    .join(" ");
  const structured = pairs ? `[bt@1 ${pairs}]` : "-";
  const msg = escapeSyslog(event.name);
  return `<${pri}>1 ${stamp} ${host} ${app} - ${event.signatureId} ${structured} ${msg}`;
}

export function formatSiemEvent(siem: SystemSettings["siem"], event: CefEvent) {
  return siem.logFormat === "SYSLOG" ? formatSyslog(siem, event) : formatCef(siem, event);
}

export async function sendSiemEvent(siem: SystemSettings["siem"], event: CefEvent) {
  if (!siem.enabled) return;
  if (!siem.host) throw new Error("SIEM adresi boş.");
  const message = formatSiemEvent(siem, event);
  const port = siem.port || 514;
  if (siem.protocol === "UDP") {
    await sendUdp(siem.host, port, message);
    return;
  }
  await sendStream(siem.host, port, `${message}\n`, siem.protocol === "TLS");
}

export async function sendCef(siem: SystemSettings["siem"], event: CefEvent) {
  return sendSiemEvent(siem, event);
}

function sendUdp(host: string, port: number, message: string) {
  return new Promise<void>((resolve, reject) => {
    const socket = dgram.createSocket(host.includes(":") ? "udp6" : "udp4");
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error("SIEM UDP gönderimi zaman aşımına uğradı."));
    }, 5000);
    socket.on("error", (error) => {
      clearTimeout(timer);
      try {
        socket.close();
      } catch {
        /* zaten kapalı */
      }
      reject(error);
    });
    socket.send(message, port, host, (error) => {
      clearTimeout(timer);
      try {
        socket.close();
      } catch {
        /* zaten kapalı */
      }
      if (error) reject(error);
      else resolve();
    });
  });
}

function sendStream(host: string, port: number, message: string, useTls: boolean) {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else resolve();
    };
    const onReady = (socket: net.Socket) => {
      socket.write(message, (error) => {
        socket.end();
        finish(error ?? undefined);
      });
    };
    const socket = useTls
      ? tls.connect(
          { host, port, ...(isIpAddress(host) ? {} : { servername: host }), ...tlsVerifyOptions() },
          () => onReady(socket),
        )
      : net.connect({ host, port }, () => onReady(socket));
    socket.setTimeout(5000, () => {
      socket.destroy();
      finish(new Error("SIEM bağlantısı zaman aşımına uğradı."));
    });
    socket.on("error", (error) => finish(error));
  });
}

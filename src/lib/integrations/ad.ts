import net from "node:net";
import tls from "node:tls";

import { testServiceBind } from "@/lib/auth/ad-login";
import { isIpAddress, tlsVerifyOptions } from "@/lib/integrations/net";
import type { SystemSettings } from "@/lib/settings";

export async function probeActiveDirectory(ad: SystemSettings["ad"]): Promise<string> {
  if (!ad.host) throw new Error("AD sunucu adresi boş.");
  const port = ad.port || (ad.useLdaps ? 636 : 389);
  await connect(ad.host, port, ad.useLdaps);
  const base = `TCP bağlantısı başarılı (${ad.host}:${port}${ad.useLdaps ? ", LDAPS" : ""}).`;
  if (!ad.bindDn || !ad.bindPassword) {
    return `${base} Servis hesabı (Bind DN/parola) boş; kullanıcı girişi kullanıcının kendi kimlik bilgileriyle doğrulanır.`;
  }
  const bind = await testServiceBind(ad);
  if (!bind.ok) throw new Error(`${base} Ancak servis hesabı ile oturum açılamadı: ${bind.message}`);
  return `${base} Servis hesabı ile oturum açıldı.`;
}

function connect(host: string, port: number, useTls: boolean) {
  return new Promise<void>((resolve, reject) => {
    const socket = useTls
      ? tls.connect({ host, port, ...(isIpAddress(host) ? {} : { servername: host }), ...tlsVerifyOptions() }, () => {
          socket.end();
          resolve();
        })
      : net.connect({ host, port }, () => {
          socket.end();
          resolve();
        });
    socket.setTimeout(5000, () => {
      socket.destroy();
      reject(new Error("Bağlantı zaman aşımına uğradı."));
    });
    socket.on("error", (error) => reject(error));
  });
}

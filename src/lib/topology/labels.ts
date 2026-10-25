export const ASSET_TYPE_TR: Record<string, string> = {
  COMPUTER: "Bilgisayar",
  SERVER: "Sunucu",
  PRINTER: "Yazıcı",
  TABLET: "Tablet",
  MOBILE_PHONE: "Mobil telefon",
  SOFTWARE: "Yazılım / lisans",
  APPLICATION: "Uygulama",
  IP_PHONE: "IP telefon",
  NETWORK_DEVICE: "Ağ cihazı",
  PERIPHERAL: "Çevre birimi",
  FIXTURE: "Demirbaş",
};

export const RELATION_SHORT: Record<string, string> = {
  HOSTED_ON: "üzerinde çalışır",
  DEPENDS_ON: "bağımlı",
  CONNECTED_TO: "bağlanır",
  PART_OF: "parçası",
};

export const RELATION_PROTOCOLS = ["TCP", "UDP", "HTTP", "HTTPS", "SSH", "RDP", "SQL", "LDAP", "SMB", "SNMP", "ICMP", "Diğer"] as const;

/** Kenar etiketi: "bağlanır · TCP/1433" */
export function relationEdgeLabel(type: string, port?: string | null, protocol?: string | null) {
  const base = RELATION_SHORT[type] ?? type;
  const p = (port ?? "").trim();
  const proto = (protocol ?? "").trim();
  const conn = [proto, p].filter(Boolean).join("/");
  return conn ? `${base} · ${conn}` : base;
}

const WELL_KNOWN: Record<string, string> = {
  "20": "FTP", "21": "FTP", "22": "SSH", "23": "Telnet", "25": "SMTP", "53": "DNS", "80": "HTTP", "88": "Kerberos",
  "110": "POP3", "123": "NTP", "135": "RPC", "143": "IMAP", "161": "SNMP", "389": "LDAP", "443": "HTTPS", "445": "SMB",
  "465": "SMTPS", "514": "Syslog", "587": "SMTP", "636": "LDAPS", "993": "IMAPS", "1433": "MSSQL", "1521": "Oracle",
  "3306": "MySQL", "3389": "RDP", "5432": "PostgreSQL", "5985": "WinRM", "5986": "WinRM", "6379": "Redis", "8080": "HTTP", "8443": "HTTPS", "9200": "Elastic", "27017": "MongoDB",
};

/** "443, 22, 3389" → "HTTPS/443 · SSH/22 · RDP/3389"; "HTTPS 443" biçimi olduğu gibi korunur. */
export function formatPorts(raw: string | null | undefined) {
  const parts = (raw ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  return parts
    .map((part) => {
      if (/^\d+$/.test(part)) return WELL_KNOWN[part] ? `${WELL_KNOWN[part]}/${part}` : part;
      const m = /^([A-Za-zÇĞİÖŞÜçğıöşü\-]+)\s*[\s/:]\s*(\d+)$/.exec(part);
      return m ? `${m[1]}/${m[2]}` : part;
    })
    .join(" · ");
}

export const AUDIENCE_SUGGESTIONS = ["Tüm istemciler", "Administrator", "Sistem yöneticileri", "Veritabanı yöneticileri", "Yedekleme sunucusu", "Tedarikçi (uzaktan destek)", "İzleme / SIEM"];

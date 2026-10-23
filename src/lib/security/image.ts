const MAGIC: Array<{ ext: string; mime: string; test: (buf: Buffer) => boolean }> = [
  { ext: "png", mime: "image/png", test: (buf) => buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 },
  { ext: "jpg", mime: "image/jpeg", test: (buf) => buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff },
  {
    ext: "gif",
    mime: "image/gif",
    test: (buf) => {
      if (buf.length < 6) return false;
      const head = buf.subarray(0, 6).toString("ascii");
      return head === "GIF87a" || head === "GIF89a";
    },
  },
  {
    ext: "webp",
    mime: "image/webp",
    test: (buf) =>
      buf.length > 12 &&
      buf.subarray(0, 4).toString("ascii") === "RIFF" &&
      buf.subarray(8, 12).toString("ascii") === "WEBP",
  },
];

export function sniffImage(buffer: Buffer) {
  const match = MAGIC.find((item) => item.test(buffer));
  return match ? { ext: match.ext, mime: match.mime } : null;
}

export function sniffUpload(buffer: Buffer) {
  if (buffer.length >= 5 && buffer.subarray(0, 4).toString("ascii") === "%PDF") {
    return { ext: "pdf", mime: "application/pdf" };
  }
  return sniffImage(buffer);
}

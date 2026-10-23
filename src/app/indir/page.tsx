import { APP_NAME, APP_VERSION } from "@/lib/app-version";
import { findReleaseZip, releaseZipName } from "@/lib/release-zip";

export const dynamic = "force-dynamic";

export default function DownloadPage() {
  const zip = findReleaseZip();
  const filename = zip?.name ?? releaseZipName();
  const version = zip?.version ?? APP_VERSION;

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center gap-4 p-6">
      <h1 className="text-xl font-semibold">{APP_NAME}</h1>
      <p className="text-muted-foreground text-sm">
        Sürüm {version} kurulum paketi. Zip’i Docker Desktop’a sürüklemeyin. Açın,{" "}
        <code className="text-foreground">yukle-docker.bat</code> dosyasına çift tıklayın. Node.js
        gerekmez; eski kayıtlar volume’da kalır.
      </p>
      {zip ? (
        <a
          className="bg-primary rounded-lg px-4 py-3 text-center text-sm font-semibold text-white"
          href="/api/paket"
          download={filename}
        >
          {version} paketini indir
        </a>
      ) : (
        <p className="text-sm">Paket dosyası sunucuda yok. `npm run package` çalıştırın.</p>
      )}
      <ol className="text-muted-foreground list-decimal space-y-1 pl-5 text-sm">
        <li>Zip’i ayrı klasöre açın (eski sürüm klasörünün üstüne yazmayın).</li>
        <li>
          <code className="text-foreground">yukle-docker.bat</code> — yol sormaz, Node.js istemez.
        </li>
        <li>
          <code className="text-foreground">docker compose down -v</code> yazmayın.
        </li>
        <li>
          Adres: <code className="text-foreground">http://127.0.0.1:43130</code>
        </li>
      </ol>
      <p className="text-muted-foreground text-xs">Dosya adı: {filename}</p>
    </main>
  );
}

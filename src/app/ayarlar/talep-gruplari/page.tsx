import { redirect } from "next/navigation";

/** Talep grupları artık "Yetki ve roller" sayfasının 4. sekmesidir. */
export default function RequestGroupsRedirect() {
  redirect("/ayarlar/yetkiler?sekme=talep");
}

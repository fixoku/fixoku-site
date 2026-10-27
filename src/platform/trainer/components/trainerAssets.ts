const root = "/images/teacher-panel";
export function courseCover(identity: string): string | undefined {
  const value = identity.toLocaleLowerCase("tr-TR");
  const file = value.includes("akici") || value.includes("akıcı") ? "akici-okuma-egitimi"
    : value.includes("ortaokul") ? "ortaokul-hizli-okuma-egitimi"
    : value.includes("paragraf") ? "paragraf-egitimi"
    : value.includes("yetiskin") || value.includes("yetişkin") ? "yetiskin-hizli-okuma-egitimi" : undefined;
  return file ? root + "/courses/" + file + ".png" : undefined;
}
export const resourceCovers: Record<string, string> = {
  CERTIFICATE: root + "/resources/basari-sertifikasi.png",
  CATALOG: root + "/resources/katalog-ve-brosurler.png",
  PROMOTIONAL: root + "/resources/tanitim-materyalleri.png",
};
export const trainerBanners = {
  hero: { src: root + "/banners/trainer-dashboard-hero.png", width: 1426, height: 344, alt: "Eğitimle daha güçlü yarınlara." },
  sharing: { src: root + "/banners/trainer-dashboard-bottom.png", width: 1680, height: 408, alt: "Bilgi paylaştıkça çoğalır." },
  future: { src: root + "/banners/trainer-presentations-bottom.png", width: 2570, height: 214, alt: "Bilgiyi paylaşmak geleceği güçlendirir." },
};

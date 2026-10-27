import { TrainerIcon } from "./TrainerIcon";
import { Link } from "react-router-dom";
import { trainerBanners } from "./trainerAssets";
export function TrainerCover({ src, title }: { src?: string; title: string }) {
  return src ? <img className="trainer-cover" src={src} alt={title} width={1448} height={1086} loading="lazy" decoding="async" /> : null;
}
export function TrainerBanner({ variant, className = "" }: { variant: keyof typeof trainerBanners; className?: string }) {
  const banner = trainerBanners[variant];
  return <img className={"trainer-banner " + className} src={banner.src} alt={banner.alt} width={banner.width} height={banner.height} loading={variant === "hero" ? "eager" : "lazy"} decoding="async" />;
}
export function TrainerHeading({ title, description }: { title: string; description: string }) {
  return <header className="trainer-page-heading"><nav aria-label="Sayfa yolu" className="trainer-breadcrumb"><Link to="/panel/egitmen"><TrainerIcon name="home" size={15} />Ana Sayfa</Link><TrainerIcon name="chevron-right" size={14} /><span aria-current="page">{title}</span></nav><h2>{title}</h2><p>{description}</p></header>;
}

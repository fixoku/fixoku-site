import { FixokuPhotoV41F, productImageDefaultV41F } from "../../admin/FixokuCatalogAssetsV41F";

export type TrainerPhysicalProduct = {
  componentId?: string;
  sku: string;
  title: string;
  quantity: number;
  imageReference?: string | null;
};

export function TrainerPhysicalProducts({ items, compact = false }: { items: TrainerPhysicalProduct[]; compact?: boolean }) {
  if (!items.length) return null;
  return <div className={`fixoku-trainer-physical-list${compact ? " is-compact" : ""}`}>
    {items.map((item, index) => <div className="fixoku-trainer-physical-item" key={item.componentId || `${item.sku}-${index}`}>
      <div className="fixoku-trainer-physical-image">
        <FixokuPhotoV41F src={item.imageReference} fallbackSrc={productImageDefaultV41F(item.sku)} alt={item.title}>
          <span aria-label="Ürün görseli yok" role="img">▤</span>
        </FixokuPhotoV41F>
      </div>
      <div className="fixoku-trainer-physical-name"><strong>{item.title}</strong><small>{item.quantity} adet · Pakete dahil</small></div>
    </div>)}
  </div>;
}

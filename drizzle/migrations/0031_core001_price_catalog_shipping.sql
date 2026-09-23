-- 0031: Core 001 current price authority and book-count shipping policy.
-- Only editable DRAFT versions are changed; published/order snapshots remain immutable.
DO $$
DECLARE
  item jsonb;
  p_id uuid;
  v_id uuid;
  latest record;
  next_version integer;
  v_slug text;
  component_sku text;
  gross integer;
  package_title text;
  package_data jsonb := '[
    {"slug":"student-primary-baslangic","gross":55000},{"slug":"student-primary-gelisim","gross":50000},{"slug":"student-primary-dijital-yapay-zeka-sistemi","gross":350000},{"slug":"student-primary-akilli-sistem","gross":450000},{"slug":"student-primary-premium-egitim","gross":1199000},{"slug":"student-primary-platinum-egitim","gross":1599000},
    {"slug":"student-middle-baslangic","gross":55000},{"slug":"student-middle-gelisim","gross":50000},{"slug":"student-middle-dijital-yapay-zeka-sistemi","gross":350000},{"slug":"student-middle-akilli-sistem","gross":450000},{"slug":"student-middle-premium-egitim","gross":1199000},{"slug":"student-middle-platinum-egitim","gross":1599000},
    {"slug":"student-high-baslangic","gross":55000},{"slug":"student-high-dijital-yapay-zeka-sistemi","gross":350000},{"slug":"student-high-akilli-sistem","gross":400000},{"slug":"student-high-premium-egitim","gross":1199000},{"slug":"student-high-platinum-egitim","gross":1599000},
    {"slug":"student-adult-baslangic","gross":55000},{"slug":"student-adult-dijital-yapay-zeka-sistemi","gross":350000},{"slug":"student-adult-akilli-sistem","gross":400000},{"slug":"student-adult-premium-egitim","gross":1199000},{"slug":"student-adult-platinum-egitim","gross":1599000},
    {"slug":"student-middle-paragraf-egitim","gross":895000},{"slug":"student-middle-paragraf-kitabi","gross":55000},{"slug":"student-high-paragraf-egitim","gross":995000},{"slug":"student-high-paragraf-kitabi","gross":55000}
  ]'::jsonb;
  trainer_data jsonb := '[
    {"slug":"ilkokul-akici-hizli-okuma-egitimi","gross":1199000,"title":"İLKOKUL AKICI VE HIZLI OKUMA EĞİTMEN EĞİTİMİ"},
    {"slug":"ortaokul-hizli-okuma-egitimi","gross":1199000,"title":"ORTAOKUL HIZLI OKUMA EĞİTMEN EĞİTİMİ"},
    {"slug":"lise-hizli-okuma-egitimi","gross":1199000,"title":"LİSE HIZLI OKUMA EĞİTMEN EĞİTİMİ"},
    {"slug":"yetiskin-hizli-okuma-egitimi","gross":1199000,"title":"YETİŞKİN HIZLI OKUMA EĞİTMEN EĞİTİMİ"},
    {"slug":"ortaokul-lise-yetiskin-hizli-okuma-egitimi","gross":1750000,"title":"ORTAOKUL + LİSE + YETİŞKİN HIZLI OKUMA EĞİTMEN EĞİTİMİ 3''LÜ SET"},
    {"slug":"ortaokul-paragraf-teknikleri-egitmen-egitimi-lgs","gross":899000,"title":"ORTAOKUL PARAGRAF EĞİTMEN EĞİTİMİ"},
    {"slug":"lise-paragraf-teknikleri-egitmen-egitimi-tyt-ayt","gross":999000,"title":"LİSE PARAGRAF EĞİTMEN EĞİTİMİ"},
    {"slug":"ortaokul-lise-paragraf-egitmen-egitimi-ikili-set","gross":1250000,"title":"ORTAOKUL + LİSE PARAGRAF EĞİTMEN EĞİTİMİ İKİLİ SET"}
  ]'::jsonb;
BEGIN
  UPDATE physical_products SET list_gross_minor=55000, vat_rate_bps=0, updated_at=now()
   WHERE r6_product_type='BOOK' AND (sku LIKE '%AKICI-HIZLI%' OR sku LIKE '%HIZLI-OKUMA' OR sku LIKE '%PARAGRAF%');
  UPDATE physical_products SET list_gross_minor=50000, vat_rate_bps=0, updated_at=now()
   WHERE r6_product_type='BOOK' AND sku LIKE '%ZIHIN-EGZERSIZLERI%';

  FOR item IN SELECT * FROM jsonb_array_elements(package_data) LOOP
    v_slug := item->>'slug'; gross := (item->>'gross')::integer;
    SELECT p.id INTO p_id FROM packages p WHERE p.slug=v_slug AND p.catalog_scope='STUDENT_COMMERCE' LIMIT 1;
    IF p_id IS NULL THEN CONTINUE; END IF;
    SELECT pv.id INTO v_id FROM package_versions pv WHERE pv.package_id=p_id AND pv.status='DRAFT' ORDER BY pv.version_number DESC LIMIT 1 FOR UPDATE;
    IF v_id IS NULL THEN
      SELECT pv.* INTO latest FROM package_versions pv WHERE pv.package_id=p_id ORDER BY pv.version_number DESC LIMIT 1;
      next_version := COALESCE(latest.version_number,0)+1;
      INSERT INTO package_versions(package_id,version_number,title,description,short_description,features_json,vat_rate_bps,price_net_minor,price_gross_minor,price_minor,currency,purchase_enabled,status)
      VALUES(p_id,next_version,latest.title,latest.description,latest.short_description,latest.features_json,2000,NULL,gross,gross,'TRY',false,'DRAFT') RETURNING id INTO v_id;
      INSERT INTO package_components(package_version_id,component_type,reference_id,physical_product_id,title_snapshot,display_label,is_active,quantity,display_order,metadata_json)
        SELECT v_id,component_type,reference_id,physical_product_id,title_snapshot,display_label,is_active,quantity,display_order,metadata_json FROM package_components WHERE package_version_id=latest.id;
    ELSE
      UPDATE package_versions SET price_gross_minor=gross,price_minor=gross,price_net_minor=NULL,vat_rate_bps=2000,currency='TRY',purchase_enabled=false,updated_at=now() WHERE id=v_id;
    END IF;
  END LOOP;

  FOR item IN SELECT * FROM jsonb_array_elements(trainer_data) LOOP
    v_slug := item->>'slug'; gross := (item->>'gross')::integer; package_title := item->>'title';
    SELECT p.id INTO p_id FROM packages p WHERE p.slug=v_slug AND p.catalog_scope='TRAINER_COMMERCE' LIMIT 1;
    IF p_id IS NULL THEN
      INSERT INTO packages(slug,audience,catalog_scope,education_stage,status,physical_product,shipping_policy,shipping_price_minor,panel_visible,public_web_visible)
      VALUES(v_slug,'TRAINER','TRAINER_COMMERCE',NULL,'DRAFT',true,'FREE',0,true,false) RETURNING id INTO p_id;
      INSERT INTO package_versions(package_id,version_number,title,description,short_description,features_json,vat_rate_bps,price_net_minor,price_gross_minor,price_minor,currency,purchase_enabled,status)
      VALUES(p_id,1,package_title,'',package_title,'[]',2000,NULL,gross,gross,'TRY',false,'DRAFT') RETURNING id INTO v_id;
    ELSE
      SELECT pv.id INTO v_id FROM package_versions pv WHERE pv.package_id=p_id AND pv.status='DRAFT' ORDER BY pv.version_number DESC LIMIT 1 FOR UPDATE;
      IF v_id IS NULL THEN
        SELECT pv.* INTO latest FROM package_versions pv WHERE pv.package_id=p_id ORDER BY pv.version_number DESC LIMIT 1;
        next_version := COALESCE(latest.version_number,0)+1;
        INSERT INTO package_versions(package_id,version_number,title,description,short_description,features_json,vat_rate_bps,price_net_minor,price_gross_minor,price_minor,currency,purchase_enabled,status)
        VALUES(p_id,next_version,package_title,latest.description,package_title,latest.features_json,2000,NULL,gross,gross,'TRY',false,'DRAFT') RETURNING id INTO v_id;
        INSERT INTO package_components(package_version_id,component_type,reference_id,physical_product_id,title_snapshot,display_label,is_active,quantity,display_order,metadata_json)
          SELECT v_id,component_type,reference_id,physical_product_id,title_snapshot,display_label,is_active,quantity,display_order,metadata_json FROM package_components WHERE package_version_id=latest.id;
      ELSE
        UPDATE package_versions SET title=package_title,price_gross_minor=gross,price_minor=gross,price_net_minor=NULL,vat_rate_bps=2000,currency='TRY',purchase_enabled=false,updated_at=now() WHERE id=v_id;
      END IF;
    END IF;
    UPDATE packages SET panel_visible=true,public_web_visible=false,physical_product=true,shipping_policy='FREE',shipping_price_minor=0,updated_at=now() WHERE id=p_id;
  END LOOP;

  -- Materialize the trainer package commercial lines from the shared product
  -- authority. Existing package/component identities are reused idempotently.
  FOR item IN SELECT * FROM jsonb_array_elements('[
    {"slug":"ilkokul-akici-hizli-okuma-egitimi","skus":["FIXOKU-PRIMARY-AKICI-HIZLI-OKUMA","FIXOKU-PRIMARY-ZIHIN-EGZERSIZLERI","FIXOKU-TRAINING-PRIMARY-FAST-INDIVIDUAL"]},
    {"slug":"ortaokul-hizli-okuma-egitimi","skus":["FIXOKU-MIDDLE-HIZLI-OKUMA","FIXOKU-MIDDLE-ZIHIN-EGZERSIZLERI","FIXOKU-TRAINING-MIDDLE-FAST-INDIVIDUAL"]},
    {"slug":"lise-hizli-okuma-egitimi","skus":["FIXOKU-HIGH-HIZLI-OKUMA","FIXOKU-TRAINING-HIGH-FAST-INDIVIDUAL"]},
    {"slug":"yetiskin-hizli-okuma-egitimi","skus":["FIXOKU-ADULT-HIZLI-OKUMA","FIXOKU-TRAINING-ADULT-FAST-INDIVIDUAL"]},
    {"slug":"ortaokul-lise-yetiskin-hizli-okuma-egitimi","skus":["FIXOKU-MIDDLE-HIZLI-OKUMA","FIXOKU-MIDDLE-ZIHIN-EGZERSIZLERI","FIXOKU-HIGH-HIZLI-OKUMA","FIXOKU-ADULT-HIZLI-OKUMA","FIXOKU-TRAINING-MIDDLE-FAST-INDIVIDUAL","FIXOKU-TRAINING-HIGH-FAST-INDIVIDUAL","FIXOKU-TRAINING-ADULT-FAST-INDIVIDUAL"]},
    {"slug":"ortaokul-paragraf-teknikleri-egitmen-egitimi-lgs","skus":["FIXOKU-STUDENT-ORTAOKUL-PARAGRAF","FIXOKU-TRAINING-MIDDLE-PARAGRAPH-INDIVIDUAL"]},
    {"slug":"lise-paragraf-teknikleri-egitmen-egitimi-tyt-ayt","skus":["FIXOKU-STUDENT-LISE-PARAGRAF","FIXOKU-TRAINING-HIGH-PARAGRAPH-INDIVIDUAL"]},
    {"slug":"ortaokul-lise-paragraf-egitmen-egitimi-ikili-set","skus":["FIXOKU-STUDENT-ORTAOKUL-PARAGRAF","FIXOKU-STUDENT-LISE-PARAGRAF","FIXOKU-TRAINING-MIDDLE-PARAGRAPH-INDIVIDUAL","FIXOKU-TRAINING-HIGH-PARAGRAPH-INDIVIDUAL"]}
  ]'::jsonb) LOOP
    SELECT pv.id INTO v_id FROM package_versions pv JOIN packages p ON p.id=pv.package_id
      WHERE p.slug=item->>'slug' AND p.catalog_scope='TRAINER_COMMERCE' AND pv.status='DRAFT'
      ORDER BY pv.version_number DESC LIMIT 1;
    IF v_id IS NULL THEN CONTINUE; END IF;
    FOR component_sku IN SELECT jsonb_array_elements_text(item->'skus') LOOP
      INSERT INTO package_components(package_version_id,component_type,reference_id,physical_product_id,title_snapshot,display_label,is_active,quantity,display_order,metadata_json)
      SELECT v_id,CASE WHEN pp.r6_product_type='TRAINING_SERVICE' THEN 'TRAINER_SERVICE'::package_component_type ELSE 'PHYSICAL_PRODUCT'::package_component_type END,pp.id,CASE WHEN pp.r6_product_type='TRAINING_SERVICE' THEN NULL ELSE pp.id END,pp.title,pp.title,true,1,COALESCE((SELECT max(display_order)+1 FROM package_components WHERE package_version_id=v_id),0),'{}'::text
      FROM physical_products pp WHERE pp.sku=component_sku
      AND NOT EXISTS (SELECT 1 FROM package_components pc WHERE pc.package_version_id=v_id AND COALESCE(pc.physical_product_id,pc.reference_id)=pp.id);
    END LOOP;
  END LOOP;

  -- The eighth trainer package is a canonical two-book bundle.
  SELECT pv.id INTO v_id FROM package_versions pv JOIN packages p ON p.id=pv.package_id
   WHERE p.slug='ortaokul-lise-paragraf-egitmen-egitimi-ikili-set' AND pv.status='DRAFT'
   ORDER BY pv.version_number DESC LIMIT 1;
  IF v_id IS NOT NULL THEN
    INSERT INTO package_components(package_version_id,component_type,reference_id,physical_product_id,title_snapshot,display_label,is_active,quantity,display_order,metadata_json)
    SELECT v_id,'PHYSICAL_PRODUCT',pp.id,pp.id,pp.title,pp.title,true,1,row_number() over (order by pp.sku)-1,'{}'::text
      FROM physical_products pp WHERE pp.sku IN ('FIXOKU-STUDENT-ORTAOKUL-PARAGRAF','FIXOKU-STUDENT-LISE-PARAGRAF')
      AND NOT EXISTS (SELECT 1 FROM package_components pc WHERE pc.package_version_id=v_id AND pc.physical_product_id=pp.id);
  END IF;
END $$;

-- Rebuild component snapshots after the product/package authority update.
DO $$
DECLARE
  v record;
  c record;
  list_total integer;
  remaining integer;
  line_discount integer;
  line_sale integer;
  line_net integer;
  line_vat integer;
  line_percent integer;
BEGIN
  FOR v IN SELECT pv.id, pv.price_gross_minor AS gross FROM package_versions pv
    JOIN packages p ON p.id=pv.package_id
    WHERE p.catalog_scope IN ('STUDENT_COMMERCE','TRAINER_COMMERCE') AND pv.status='DRAFT' AND pv.price_gross_minor IS NOT NULL
  LOOP
    SELECT COALESCE(sum(pp.list_gross_minor*pc.quantity),0) INTO list_total
      FROM package_components pc JOIN physical_products pp ON pp.id=COALESCE(pc.physical_product_id,pc.reference_id)
      WHERE pc.package_version_id=v.id AND pc.is_active=true AND pc.component_type<>'TEXT_ITEM';
    IF v.gross > list_total THEN RAISE EXCEPTION 'CORE001_PACKAGE_PRICE_EXCEEDS_LIST:%',v.id; END IF;
    remaining := list_total-v.gross;
    FOR c IN SELECT pc.id, pp.list_gross_minor*pc.quantity AS line_list, pp.vat_rate_bps AS vat_rate
      FROM package_components pc JOIN physical_products pp ON pp.id=COALESCE(pc.physical_product_id,pc.reference_id)
      WHERE pc.package_version_id=v.id AND pc.is_active=true AND pc.component_type<>'TEXT_ITEM'
      ORDER BY CASE WHEN pp.r6_product_type IN ('SOFTWARE','TRAINING_SERVICE') THEN 0 ELSE 1 END, pc.display_order, pc.id
    LOOP
      line_discount := LEAST(remaining,c.line_list); remaining := remaining-line_discount;
      line_sale := c.line_list-line_discount;
      line_net := ((line_sale::bigint*10000)/(10000+c.vat_rate::bigint))::integer;
      line_vat := line_sale-line_net;
      line_percent := CASE WHEN c.line_list=0 THEN 0 ELSE ((line_discount::bigint*10000+c.line_list/2)/c.line_list)::integer END;
      INSERT INTO r6_package_component_pricing(package_component_id,list_gross_minor,effective_sale_gross_minor,discount_minor,discount_percent_bps,vat_rate_bps,net_minor,vat_minor,currency)
      SELECT c.id,c.line_list,line_sale,line_discount,line_percent,c.vat_rate,line_net,line_vat,'TRY'
      ON CONFLICT(package_component_id) DO UPDATE SET list_gross_minor=excluded.list_gross_minor,effective_sale_gross_minor=excluded.effective_sale_gross_minor,discount_minor=excluded.discount_minor,discount_percent_bps=excluded.discount_percent_bps,vat_rate_bps=excluded.vat_rate_bps,net_minor=excluded.net_minor,vat_minor=excluded.vat_minor,currency='TRY',updated_at=now();
    END LOOP;
    IF remaining<>0 THEN RAISE EXCEPTION 'CORE001_DISCOUNT_ALLOCATION_FAILED:%',v.id; END IF;
  END LOOP;
END $$;

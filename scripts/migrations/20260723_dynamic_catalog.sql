-- SALGADOS R - catalogo dinamico administravel
-- Migration nao destrutiva. Revisar, fazer backup e executar somente apos homologacao.

CREATE TABLE IF NOT EXISTS product_subcategories (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  show_public BOOLEAN NOT NULL DEFAULT TRUE,
  show_admin BOOLEAN NOT NULL DEFAULT TRUE,
  archived_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category_id, slug)
);

CREATE TABLE IF NOT EXISTS product_flavors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  slug TEXT UNIQUE NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'unidade',
  volume_ml INTEGER,
  slug TEXT UNIQUE NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS show_public BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS show_admin BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT '';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS created_by TEXT;

ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id TEXT REFERENCES categories(id) ON DELETE RESTRICT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory_id TEXT REFERENCES product_subcategories(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS flavor_id TEXT REFERENCES product_flavors(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'unidade';
ALTER TABLE products ADD COLUMN IF NOT EXISTS volume_ml INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS show_public BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS available_for_sale BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS available_for_production BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS establishment_only BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_by TEXT;

UPDATE products p
SET category_id = c.id
FROM categories c
WHERE p.category_id IS NULL AND c.slug = p.category;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_product_variants_volume_non_negative') THEN
    ALTER TABLE product_variants ADD CONSTRAINT chk_product_variants_volume_non_negative CHECK (volume_ml IS NULL OR volume_ml >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_volume_non_negative') THEN
    ALTER TABLE products ADD CONSTRAINT chk_products_volume_non_negative CHECK (volume_ml IS NULL OR volume_ml >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_price_non_negative') THEN
    ALTER TABLE products ADD CONSTRAINT chk_products_price_non_negative CHECK (price_cents >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_product_subcategories_category ON product_subcategories (category_id, sort_order, name);
CREATE INDEX IF NOT EXISTS idx_products_catalog_category ON products (category_id, subcategory_id, sort_order, name);
CREATE INDEX IF NOT EXISTS idx_products_catalog_active ON products (active, show_public, available_for_sale);

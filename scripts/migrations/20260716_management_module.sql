-- SALGADOS R - modulo de gestao operacional e financeira
-- Migration nao destrutiva. Revisar e executar somente apos backup em producao.

CREATE TABLE IF NOT EXISTS product_price_history (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price_cents INTEGER NOT NULL,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  notes TEXT NOT NULL DEFAULT '',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_cost_history (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  cost_cents INTEGER NOT NULL,
  unit TEXT NOT NULL DEFAULT 'unidade',
  source TEXT NOT NULL DEFAULT 'manual',
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  notes TEXT NOT NULL DEFAULT '',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commercial_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_entries (
  id TEXT PRIMARY KEY,
  production_date DATE NOT NULL,
  period TEXT NOT NULL DEFAULT '',
  responsible TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'RASCUNHO',
  notes TEXT NOT NULL DEFAULT '',
  cancel_reason TEXT,
  created_by TEXT,
  updated_by TEXT,
  cancelled_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS production_entry_items (
  id TEXT PRIMARY KEY,
  production_entry_id TEXT NOT NULL REFERENCES production_entries(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  product_name_snapshot TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'unidade',
  quantity_produced NUMERIC NOT NULL DEFAULT 0,
  quantity_lost NUMERIC NOT NULL DEFAULT 0,
  quantity_internal_use NUMERIC NOT NULL DEFAULT 0,
  volume_ml INTEGER,
  notes TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS management_sales (
  id TEXT PRIMARY KEY,
  sale_code TEXT UNIQUE NOT NULL,
  sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  surcharge_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  paid_cents INTEGER NOT NULL DEFAULT 0,
  debt_cents INTEGER NOT NULL DEFAULT 0,
  financial_status TEXT NOT NULL DEFAULT 'PAGO',
  status TEXT NOT NULL DEFAULT 'CONFIRMADO',
  notes TEXT NOT NULL DEFAULT '',
  cancel_reason TEXT,
  created_by TEXT,
  cancelled_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS management_sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL REFERENCES management_sales(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  product_name_snapshot TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'unidade',
  volume_ml INTEGER,
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  unit_cost_cents INTEGER,
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_entries (
  id TEXT PRIMARY KEY,
  sale_id TEXT REFERENCES management_sales(id) ON DELETE CASCADE,
  receivable_id TEXT,
  method TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT NOT NULL DEFAULT '',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS receivables (
  id TEXT PRIMARY KEY,
  sale_id TEXT REFERENCES management_sales(id) ON DELETE SET NULL,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  original_amount_cents INTEGER NOT NULL,
  paid_amount_cents INTEGER NOT NULL DEFAULT 0,
  outstanding_amount_cents INTEGER NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'ABERTA',
  notes TEXT NOT NULL DEFAULT '',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS receivable_payments (
  id TEXT PRIMARY KEY,
  receivable_id TEXT NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  payment_method TEXT NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT NOT NULL DEFAULT '',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expense_categories (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_exports (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  filters JSONB NOT NULL,
  generated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'unidade';
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_cents INTEGER;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Outros';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'dinheiro';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS supplier TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by TEXT;

CREATE INDEX IF NOT EXISTS idx_production_entries_date ON production_entries (production_date);
CREATE INDEX IF NOT EXISTS idx_production_items_product ON production_entry_items (product_id);
CREATE INDEX IF NOT EXISTS idx_management_sales_date ON management_sales (sale_date);
CREATE INDEX IF NOT EXISTS idx_management_sale_items_product ON management_sale_items (product_id);
CREATE INDEX IF NOT EXISTS idx_payment_entries_sale ON payment_entries (sale_id);
CREATE INDEX IF NOT EXISTS idx_receivables_status ON receivables (status);
CREATE INDEX IF NOT EXISTS idx_receivables_due_date ON receivables (due_date);
CREATE INDEX IF NOT EXISTS idx_product_price_history_validity ON product_price_history (product_id, valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_product_cost_history_validity ON product_cost_history (product_id, valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_payment_entries_receivable ON payment_entries (receivable_id);

ALTER TABLE management_sales ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_management_sales_idempotency_key
  ON management_sales (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_product_price_history_price_non_negative') THEN
    ALTER TABLE product_price_history ADD CONSTRAINT chk_product_price_history_price_non_negative CHECK (price_cents >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_product_cost_history_cost_non_negative') THEN
    ALTER TABLE product_cost_history ADD CONSTRAINT chk_product_cost_history_cost_non_negative CHECK (cost_cents >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_production_entries_status') THEN
    ALTER TABLE production_entries ADD CONSTRAINT chk_production_entries_status CHECK (status IN ('RASCUNHO', 'CONFIRMADO', 'CANCELADO'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_production_entry_items_non_negative') THEN
    ALTER TABLE production_entry_items ADD CONSTRAINT chk_production_entry_items_non_negative CHECK (
      quantity_produced >= 0 AND quantity_lost >= 0 AND quantity_internal_use >= 0 AND (volume_ml IS NULL OR volume_ml >= 0)
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_management_sales_money_non_negative') THEN
    ALTER TABLE management_sales ADD CONSTRAINT chk_management_sales_money_non_negative CHECK (
      subtotal_cents >= 0 AND discount_cents >= 0 AND surcharge_cents >= 0 AND total_cents >= 0 AND paid_cents >= 0 AND debt_cents >= 0
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_management_sales_status') THEN
    ALTER TABLE management_sales ADD CONSTRAINT chk_management_sales_status CHECK (status IN ('CONFIRMADO', 'CANCELADO', 'ESTORNADO'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_management_sales_financial_status') THEN
    ALTER TABLE management_sales ADD CONSTRAINT chk_management_sales_financial_status CHECK (financial_status IN ('PAGO', 'PARCIAL', 'EM_DIVIDA', 'CANCELADO', 'ESTORNADO'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_management_sale_items_non_negative') THEN
    ALTER TABLE management_sale_items ADD CONSTRAINT chk_management_sale_items_non_negative CHECK (
      quantity >= 0 AND (volume_ml IS NULL OR volume_ml >= 0) AND unit_price_cents >= 0 AND (unit_cost_cents IS NULL OR unit_cost_cents >= 0) AND subtotal_cents >= 0
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_payment_entries_amount_positive') THEN
    ALTER TABLE payment_entries ADD CONSTRAINT chk_payment_entries_amount_positive CHECK (amount_cents > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_payment_entries_method') THEN
    ALTER TABLE payment_entries ADD CONSTRAINT chk_payment_entries_method CHECK (method IN ('pix', 'cartao', 'dinheiro', 'divida', 'estorno'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_receivables_money_non_negative') THEN
    ALTER TABLE receivables ADD CONSTRAINT chk_receivables_money_non_negative CHECK (
      original_amount_cents >= 0 AND paid_amount_cents >= 0 AND outstanding_amount_cents >= 0
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_receivables_status') THEN
    ALTER TABLE receivables ADD CONSTRAINT chk_receivables_status CHECK (status IN ('ABERTA', 'PARCIALMENTE_PAGA', 'PAGA', 'CANCELADA', 'VENCIDA'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_receivable_payments_amount_positive') THEN
    ALTER TABLE receivable_payments ADD CONSTRAINT chk_receivable_payments_amount_positive CHECK (amount_cents > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_receivable_payments_method') THEN
    ALTER TABLE receivable_payments ADD CONSTRAINT chk_receivable_payments_method CHECK (payment_method IN ('pix', 'cartao', 'dinheiro'));
  END IF;
END $$;

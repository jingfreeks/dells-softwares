// Hand-written to match supabase/migrations/0001_init.sql.
//
// Once the project is live, prefer regenerating this from the real schema:
//   npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts

export type StaffRole = "admin" | "cashier";
export type SaleItemType = "product" | "service";
export type PaymentType = "cash" | "credit" | "qr";
export type SaleStatus = "completed" | "voided";

export interface Database {
  public: {
    Tables: {
      document_series: {
        Row: {
          id: string;
          store_id: string;
          series_key: string;
          prefix: string;
          next_number: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          series_key?: string;
          prefix?: string;
          next_number?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          series_key?: string;
          prefix?: string;
          next_number?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "document_series_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      stores: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          photo_url: string | null;
          created_at: string;
          contact_number: string | null;
          city: string | null;
          tin: string | null;
          business_permit_no: string | null;
          bir_registered: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          photo_url?: string | null;
          created_at?: string;
          contact_number?: string | null;
          city?: string | null;
          tin?: string | null;
          business_permit_no?: string | null;
          bir_registered?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          photo_url?: string | null;
          created_at?: string;
          contact_number?: string | null;
          city?: string | null;
          tin?: string | null;
          business_permit_no?: string | null;
          bir_registered?: boolean;
        };
        Relationships: [];
      };
      staff: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          email: string;
          role: StaffRole;
          avatar_url: string | null;
          phone: string | null;
          address: string | null;
          onboarded_at: string | null;
          created_at: string;
          pin_hash: string | null;
        };
        Insert: {
          id: string;
          store_id: string;
          name: string;
          email: string;
          role?: StaffRole;
          avatar_url?: string | null;
          phone?: string | null;
          address?: string | null;
          onboarded_at?: string | null;
          created_at?: string;
          pin_hash?: string | null;
        };
        Update: {
          id?: string;
          store_id?: string;
          name?: string;
          email?: string;
          role?: StaffRole;
          avatar_url?: string | null;
          phone?: string | null;
          address?: string | null;
          onboarded_at?: string | null;
          created_at?: string;
          pin_hash?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "staff_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: { id: string; store_id: string; name: string; created_at: string };
        Insert: { id?: string; store_id: string; name: string; created_at?: string };
        Update: { id?: string; store_id?: string; name?: string; created_at?: string };
        Relationships: [
          {
            foreignKeyName: "categories_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          store_id: string;
          barcode: string | null;
          name: string;
          price: number;
          stock: number;
          low_stock_threshold: number;
          category: string;
          category_id: string;
          pack_quantity: number | null;
          pack_price: number | null;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          barcode?: string | null;
          name: string;
          price: number;
          stock?: number;
          low_stock_threshold?: number;
          category?: string;
          category_id: string;
          pack_quantity?: number | null;
          pack_price?: number | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          barcode?: string | null;
          name?: string;
          price?: number;
          stock?: number;
          low_stock_threshold?: number;
          category?: string;
          category_id?: string;
          pack_quantity?: number | null;
          pack_price?: number | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      sales: {
        Row: {
          id: string;
          store_id: string;
          cashier_id: string;
          total: number;
          customer_id: string | null;
          payment_type: PaymentType;
          reference_no: string | null;
          created_at: string;
          // Added by a later migration than 0001_init.sql (offline-sync +
          // BIR-audit work) -- set only for a sale queued offline and
          // synced later; null for a normal live sale (see mapSaleRow).
          occurred_at: string | null;
          status: SaleStatus;
        };
        Insert: {
          id?: string;
          store_id: string;
          cashier_id: string;
          total: number;
          customer_id?: string | null;
          payment_type?: PaymentType;
          reference_no?: string | null;
          created_at?: string;
          occurred_at?: string | null;
          status?: SaleStatus;
        };
        Update: {
          id?: string;
          store_id?: string;
          cashier_id?: string;
          total?: number;
          customer_id?: string | null;
          payment_type?: PaymentType;
          reference_no?: string | null;
          created_at?: string;
          occurred_at?: string | null;
          status?: SaleStatus;
        };
        Relationships: [
          {
            foreignKeyName: "sales_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_cashier_id_fkey";
            columns: ["cashier_id"];
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          phone: string | null;
          credit_limit: number | null;
          balance: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          name: string;
          phone?: string | null;
          credit_limit?: number | null;
          balance?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          name?: string;
          phone?: string | null;
          credit_limit?: number | null;
          balance?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      credit_payments: {
        Row: {
          id: string;
          store_id: string;
          customer_id: string;
          amount: number;
          note: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          customer_id: string;
          amount: number;
          note?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          customer_id?: string;
          amount?: number;
          note?: string | null;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "credit_payments_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credit_payments_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      suppliers: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          phone: string | null;
          address: string | null;
          scan_code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          name: string;
          phone?: string | null;
          address?: string | null;
          scan_code?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          name?: string;
          phone?: string | null;
          address?: string | null;
          scan_code?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "suppliers_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      sale_items: {
        Row: {
          id: string;
          sale_id: string;
          product_id: string | null;
          name: string;
          quantity: number;
          price: number;
          item_type: SaleItemType;
          fee: number;
          line_total: number;
        };
        Insert: {
          id?: string;
          sale_id: string;
          product_id?: string | null;
          name: string;
          quantity: number;
          price: number;
          item_type?: SaleItemType;
          fee?: number;
          line_total: number;
        };
        Update: {
          id?: string;
          sale_id?: string;
          product_id?: string | null;
          name?: string;
          quantity?: number;
          price?: number;
          item_type?: SaleItemType;
          fee?: number;
          line_total?: number;
        };
        Relationships: [
          {
            foreignKeyName: "sale_items_sale_id_fkey";
            columns: ["sale_id"];
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sale_items_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      receiving_entries: {
        Row: {
          id: string;
          store_id: string;
          supplier: string;
          supplier_id: string | null;
          received_on: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          supplier: string;
          supplier_id?: string | null;
          received_on: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          supplier?: string;
          supplier_id?: string | null;
          received_on?: string;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "receiving_entries_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "receiving_entries_supplier_id_fkey";
            columns: ["supplier_id"];
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      receiving_lines: {
        Row: {
          id: string;
          receiving_entry_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          cost_each: number;
        };
        Insert: {
          id?: string;
          receiving_entry_id: string;
          product_id?: string | null;
          product_name: string;
          quantity: number;
          cost_each?: number;
        };
        Update: {
          id?: string;
          receiving_entry_id?: string;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          cost_each?: number;
        };
        Relationships: [
          {
            foreignKeyName: "receiving_lines_receiving_entry_id_fkey";
            columns: ["receiving_entry_id"];
            referencedRelation: "receiving_entries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "receiving_lines_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      feature_flags: {
        Row: { key: string; enabled: boolean; description: string; updated_at: string };
        Insert: { key: string; enabled?: boolean; description?: string; updated_at?: string };
        Update: { key?: string; enabled?: boolean; description?: string; updated_at?: string };
        Relationships: [];
      };
      devices: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          paired_by: string;
          paired_at: string;
          last_seen_at: string | null;
          unpaired_at: string | null;
        };
        Insert: {
          id: string;
          store_id: string;
          name: string;
          paired_by: string;
          paired_at?: string;
          last_seen_at?: string | null;
          unpaired_at?: string | null;
        };
        Update: {
          id?: string;
          store_id?: string;
          name?: string;
          paired_by?: string;
          paired_at?: string;
          last_seen_at?: string | null;
          unpaired_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "devices_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      demo_products: {
        Row: {
          id: string;
          name: string;
          category: string;
          price: number;
          stock: number;
          low_stock_threshold: number;
          sort_order: number;
          sold_count: number;
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          price: number;
          stock: number;
          low_stock_threshold?: number;
          sort_order?: number;
          sold_count?: number;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          price?: number;
          stock?: number;
          low_stock_threshold?: number;
          sort_order?: number;
          sold_count?: number;
        };
        Relationships: [];
      };
      demo_sales: {
        Row: { id: string; occurred_at: string; total: number; item_count: number };
        Insert: { id?: string; occurred_at: string; total: number; item_count: number };
        Update: { id?: string; occurred_at?: string; total?: number; item_count?: number };
        Relationships: [];
      };
      demo_customers: {
        Row: { id: string; name: string; balance: number };
        Insert: { id?: string; name: string; balance?: number };
        Update: { id?: string; name?: string; balance?: number };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      checkout_sale: {
        Args: {
          p_items: { product_id: string; quantity: number }[];
          p_services?: { label: string; amount: number; fee?: number }[];
          p_customer_id?: string | null;
          p_payment_type?: PaymentType;
          p_reference_no?: string | null;
          p_discount_type?: "percentage" | "flat" | null;
          p_discount_value?: number | null;
          p_cashier_token?: string | null;
        };
        Returns: { sale_id: string; total: number }[];
      };
      record_credit_payment: {
        Args: {
          p_customer_id: string;
          p_amount: number;
          p_note?: string | null;
        };
        Returns: { customer_id: string; new_balance: number }[];
      };
      generate_pairing_code: {
        Args: Record<string, never>;
        Returns: { code: string; expires_at: string }[];
      };
      admin_unpair_device: {
        Args: { p_device_id: string; p_owner_pin: string };
        Returns: undefined;
      };
      list_pickable_cashiers: {
        Args: Record<string, never>;
        Returns: { id: string; name: string; avatar_url: string | null }[];
      };
      start_cashier_session: {
        Args: { p_staff_id: string; p_pin: string; p_opening_float: number };
        Returns: {
          ok: boolean;
          error_code: string | null;
          token: string | null;
          staff_id: string | null;
          name: string | null;
          role: StaffRole | null;
          avatar_url: string | null;
          expires_at: string | null;
        }[];
      };
      end_cashier_session: {
        Args: { p_token: string; p_closing_float?: number | null };
        Returns: undefined;
      };
      set_own_pin: {
        Args: { p_pin: string };
        Returns: undefined;
      };
      start_trial: {
        Args: { p_plan_code: string };
        Returns: undefined;
      };
      my_store_billing_state: {
        Args: Record<string, never>;
        Returns: {
          organization_status: string;
          subscription_status: string;
          writes_allowed: boolean;
          grace_ends_at: string | null;
          trial_ends_at: string | null;
        }[];
      };
      my_store_plan: {
        Args: Record<string, never>;
        Returns: {
          plan_code: string;
          name: string;
          price_php: number | null;
          billing_interval: string;
          features: string[];
        }[];
      };
      plan_prices: {
        Args: Record<string, never>;
        Returns: {
          plan_code: string;
          name: string;
          price_php: number | null;
          billing_interval: string;
          features: string[];
          sort_order: number;
        }[];
      };
      my_store_features: {
        Args: Record<string, never>;
        Returns: { feature_code: string; module_code: string; name: string; enabled: boolean }[];
      };
    };
    Enums: {
      staff_role: StaffRole;
    };
    CompositeTypes: Record<string, never>;
  };
}

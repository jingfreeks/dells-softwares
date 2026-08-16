// Hand-written to match apps/tindahan-pos/supabase/migrations — this app
// shares that same Supabase project/database, so this type only covers the
// tables this app actually touches (stores/staff/products/suppliers plus
// the warehouse/PO/receiving/conversion/balance/count tables added in
// 0017_inventory_management.sql). See tindahan-pos's own database.types.ts
// for the full schema including POS-only tables (sales, customers, etc).
//
// Once the project is live, prefer regenerating from the real schema:
//   npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts

export type StaffRole = "admin" | "cashier";
export type PurchaseOrderStatusDb =
  | "draft"
  | "submitted"
  | "partially_received"
  | "received"
  | "cancelled";
export type InventoryCountStatusDb = "open" | "closed";

export interface Database {
  public: {
    Tables: {
      stores: {
        Row: { id: string; name: string; address: string | null; photo_url: string | null; created_at: string };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          photo_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          photo_url?: string | null;
          created_at?: string;
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
          created_at: string;
        };
        Insert: {
          id: string;
          store_id: string;
          name: string;
          email: string;
          role?: StaffRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          name?: string;
          email?: string;
          role?: StaffRole;
          created_at?: string;
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
      warehouses: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          address: string | null;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          name: string;
          address?: string | null;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          name?: string;
          address?: string | null;
          is_default?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "warehouses_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      warehouse_stock: {
        Row: {
          id: string;
          warehouse_id: string;
          product_id: string;
          quantity: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          warehouse_id: string;
          product_id: string;
          quantity?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          warehouse_id?: string;
          product_id?: string;
          quantity?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "warehouse_stock_warehouse_id_fkey";
            columns: ["warehouse_id"];
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "warehouse_stock_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_orders: {
        Row: {
          id: string;
          store_id: string;
          supplier_id: string | null;
          warehouse_id: string;
          status: PurchaseOrderStatusDb;
          order_date: string;
          expected_date: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          supplier_id?: string | null;
          warehouse_id: string;
          status?: PurchaseOrderStatusDb;
          order_date?: string;
          expected_date?: string | null;
          notes?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          supplier_id?: string | null;
          warehouse_id?: string;
          status?: PurchaseOrderStatusDb;
          order_date?: string;
          expected_date?: string | null;
          notes?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_orders_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey";
            columns: ["supplier_id"];
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_warehouse_id_fkey";
            columns: ["warehouse_id"];
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_order_lines: {
        Row: {
          id: string;
          purchase_order_id: string;
          product_id: string | null;
          product_name: string;
          quantity_ordered: number;
          quantity_received: number;
          unit_cost: number;
        };
        Insert: {
          id?: string;
          purchase_order_id: string;
          product_id?: string | null;
          product_name: string;
          quantity_ordered: number;
          quantity_received?: number;
          unit_cost?: number;
        };
        Update: {
          id?: string;
          purchase_order_id?: string;
          product_id?: string | null;
          product_name?: string;
          quantity_ordered?: number;
          quantity_received?: number;
          unit_cost?: number;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey";
            columns: ["purchase_order_id"];
            referencedRelation: "purchase_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_lines_product_id_fkey";
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
          purchase_order_id: string | null;
          warehouse_id: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          supplier: string;
          supplier_id?: string | null;
          received_on: string;
          purchase_order_id?: string | null;
          warehouse_id: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          supplier?: string;
          supplier_id?: string | null;
          received_on?: string;
          purchase_order_id?: string | null;
          warehouse_id?: string;
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
          {
            foreignKeyName: "receiving_entries_purchase_order_id_fkey";
            columns: ["purchase_order_id"];
            referencedRelation: "purchase_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "receiving_entries_warehouse_id_fkey";
            columns: ["warehouse_id"];
            referencedRelation: "warehouses";
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
      product_unit_conversions: {
        Row: {
          id: string;
          store_id: string;
          product_id: string;
          unit_name: string;
          base_unit_factor: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          product_id: string;
          unit_name: string;
          base_unit_factor: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          product_id?: string;
          unit_name?: string;
          base_unit_factor?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_unit_conversions_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_beginning_balances: {
        Row: {
          id: string;
          store_id: string;
          warehouse_id: string;
          product_id: string;
          quantity: number;
          unit_cost: number;
          as_of_date: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          warehouse_id: string;
          product_id: string;
          quantity: number;
          unit_cost?: number;
          as_of_date: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          warehouse_id?: string;
          product_id?: string;
          quantity?: number;
          unit_cost?: number;
          as_of_date?: string;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_beginning_balances_warehouse_id_fkey";
            columns: ["warehouse_id"];
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_beginning_balances_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_counts: {
        Row: {
          id: string;
          store_id: string;
          warehouse_id: string;
          status: InventoryCountStatusDb;
          counted_on: string;
          created_by: string;
          created_at: string;
          closed_at: string | null;
        };
        Insert: {
          id?: string;
          store_id: string;
          warehouse_id: string;
          status?: InventoryCountStatusDb;
          counted_on?: string;
          created_by: string;
          created_at?: string;
          closed_at?: string | null;
        };
        Update: {
          id?: string;
          store_id?: string;
          warehouse_id?: string;
          status?: InventoryCountStatusDb;
          counted_on?: string;
          created_by?: string;
          created_at?: string;
          closed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_counts_warehouse_id_fkey";
            columns: ["warehouse_id"];
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_count_lines: {
        Row: {
          id: string;
          inventory_count_id: string;
          product_id: string;
          system_quantity: number;
          counted_quantity: number;
          variance: number;
        };
        Insert: {
          id?: string;
          inventory_count_id: string;
          product_id: string;
          system_quantity: number;
          counted_quantity: number;
        };
        Update: {
          id?: string;
          inventory_count_id?: string;
          product_id?: string;
          system_quantity?: number;
          counted_quantity?: number;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_count_lines_inventory_count_id_fkey";
            columns: ["inventory_count_id"];
            referencedRelation: "inventory_counts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_count_lines_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      warehouse_transfers: {
        Row: {
          id: string;
          store_id: string;
          from_warehouse_id: string;
          to_warehouse_id: string;
          product_id: string;
          quantity: number;
          notes: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          from_warehouse_id: string;
          to_warehouse_id: string;
          product_id: string;
          quantity: number;
          notes?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          from_warehouse_id?: string;
          to_warehouse_id?: string;
          product_id?: string;
          quantity?: number;
          notes?: string | null;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "warehouse_transfers_from_warehouse_id_fkey";
            columns: ["from_warehouse_id"];
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "warehouse_transfers_to_warehouse_id_fkey";
            columns: ["to_warehouse_id"];
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "warehouse_transfers_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      transfer_stock: {
        Args: {
          p_from_warehouse_id: string;
          p_to_warehouse_id: string;
          p_product_id: string;
          p_quantity: number;
          p_notes?: string | null;
        };
        Returns: { transfer_id: string }[];
      };
      // 0044_rbac_foundation.sql (tindahan-pos migrations -- this app shares
      // the same Supabase project/schema and has no migrations of its own).
      list_my_permissions: {
        Args: Record<string, never>;
        Returns: string[];
      };
      // 20260815096000_public_module_contract.sql -- the public wrapper the
      // browser uses, since the `core` schema is not exposed to PostgREST.
      my_store_modules: {
        Args: Record<string, never>;
        Returns: { module_code: string; name: string; enabled: boolean }[];
      };
      // 20260815100000_grace_and_downgrade_ladder.sql -- the §08 ladder.
      // Separate from my_store_modules: entitlement and billing state are
      // different questions and a store can fail either independently.
      my_store_billing_state: {
        Args: Record<string, never>;
        Returns: {
          organization_status: string;
          subscription_status: string;
          writes_allowed: boolean;
          /** Only set while PAST_DUE. */
          grace_ends_at: string | null;
        }[];
      };
    };
    Enums: {
      staff_role: StaffRole;
      purchase_order_status: PurchaseOrderStatusDb;
      inventory_count_status: InventoryCountStatusDb;
    };
    CompositeTypes: Record<string, never>;
  };
}

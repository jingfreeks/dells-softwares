// Hand-written to match supabase/migrations/0001_init.sql.
//
// Once the project is live, prefer regenerating this from the real schema:
//   npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts

export type StaffRole = "admin" | "cashier";
export type SaleItemType = "product" | "service";

export interface Database {
  public: {
    Tables: {
      stores: {
        Row: { id: string; name: string; created_at: string };
        Insert: { id?: string; name: string; created_at?: string };
        Update: { id?: string; name?: string; created_at?: string };
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
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          cashier_id: string;
          total: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          cashier_id?: string;
          total?: number;
          created_at?: string;
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
          received_on: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          supplier: string;
          received_on: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          supplier?: string;
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
    };
    Views: Record<string, never>;
    Functions: {
      checkout_sale: {
        Args: {
          p_items: { product_id: string; quantity: number }[];
          p_services?: { label: string; amount: number; fee?: number }[];
        };
        Returns: { sale_id: string; total: number }[];
      };
    };
    Enums: {
      staff_role: StaffRole;
    };
    CompositeTypes: Record<string, never>;
  };
}

// Hand-written to match supabase/migrations/0001_init.sql.
//
// Once the project is live, prefer regenerating this from the real schema:
//   npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts

import type { PaymentType, StoreFeeConfig, VatStatus } from "./types";

/** One persisted X or Z reading. Mirrors Tables["register_readings"]["Row"]. */
export interface RegisterReadingRow {
  id: string;
  store_id: string;
  kind: "X" | "Z";
  z_counter: number | null;
  reset_counter: number;
  business_date: string;
  opened_at: string;
  closed_at: string;
  grand_total: number;
  gross_sales: number;
  net_sales: number;
  total_discounts: number;
  vatable_sales: number;
  vat_amount: number;
  vat_exempt: number;
  zero_rated: number;
  transaction_count: number;
  voided_count: number;
  voided_total: number;
  refund_count: number;
  refund_total: number;
  beginning_receipt: string | null;
  ending_receipt: string | null;
  payment_breakdown: Json;
  late_entry_count: number;
  late_entry_total: number;
  device_id: string | null;
  taken_by: string;
  created_at: string;
}

export type StaffRole = "admin" | "cashier";
export type SaleItemType = "product" | "service";
export type StoreFeeConfigRow = StoreFeeConfig;
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      stores: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          photo_url: string | null;
          fee_config: StoreFeeConfigRow | null;
          created_at: string;
          contact_number: string | null;
          city: string | null;
          tin: string | null;
          business_permit_no: string | null;
          bir_registered: boolean;
          vat_status: VatStatus;
          vat_rate: number;
          invoice_type: string;
          cashier_can_edit_prices: boolean;
          void_requires_pin: boolean;
          cashier_cash_out_cap: number | null;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          photo_url?: string | null;
          fee_config?: StoreFeeConfigRow | null;
          created_at?: string;
          contact_number?: string | null;
          city?: string | null;
          tin?: string | null;
          business_permit_no?: string | null;
          bir_registered?: boolean;
          vat_status?: VatStatus;
          vat_rate?: number;
          invoice_type?: string;
          cashier_can_edit_prices?: boolean;
          void_requires_pin?: boolean;
          cashier_cash_out_cap?: number | null;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          photo_url?: string | null;
          fee_config?: StoreFeeConfigRow | null;
          created_at?: string;
          contact_number?: string | null;
          city?: string | null;
          tin?: string | null;
          business_permit_no?: string | null;
          bir_registered?: boolean;
          vat_status?: VatStatus;
          vat_rate?: number;
          invoice_type?: string;
          cashier_can_edit_prices?: boolean;
          void_requires_pin?: boolean;
          cashier_cash_out_cap?: number | null;
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
          pin_hash: string | null;
          active: boolean;
          pin_failed_attempts: number;
          pin_locked_until: string | null;
          created_at: string;
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
          pin_hash?: string | null;
          active?: boolean;
          pin_failed_attempts?: number;
          pin_locked_until?: string | null;
          created_at?: string;
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
          pin_hash?: string | null;
          active?: boolean;
          pin_failed_attempts?: number;
          pin_locked_until?: string | null;
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
          pack_quantity: number | null;
          pack_price: number | null;
          image_url: string | null;
          cost: number | null;
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
          cost?: number | null;
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
          cost?: number | null;
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
          client_request_id: string | null;
          occurred_at: string | null;
          is_offline_replay: boolean;
          receipt_number: string | null;
          status: "completed" | "voided";
          voided_at: string | null;
          voided_by: string | null;
          void_reason: string | null;
          vat_status: VatStatus | null;
          vat_rate: number | null;
          vatable_sales: number;
          vat_amount: number;
          vat_exempt_sales: number;
          zero_rated_sales: number;
          device_id: string | null;
          discount_type: "percentage" | "flat" | null;
          discount_value: number | null;
          discount_amount: number;
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
          client_request_id?: string | null;
          occurred_at?: string | null;
          is_offline_replay?: boolean;
          receipt_number?: string | null;
          status?: "completed" | "voided";
          voided_at?: string | null;
          voided_by?: string | null;
          void_reason?: string | null;
          vat_status?: VatStatus | null;
          vat_rate?: number | null;
          vatable_sales?: number;
          vat_amount?: number;
          vat_exempt_sales?: number;
          zero_rated_sales?: number;
          device_id?: string | null;
          discount_type?: "percentage" | "flat" | null;
          discount_value?: number | null;
          discount_amount?: number;
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
          client_request_id?: string | null;
          occurred_at?: string | null;
          is_offline_replay?: boolean;
          receipt_number?: string | null;
          status?: "completed" | "voided";
          voided_at?: string | null;
          voided_by?: string | null;
          void_reason?: string | null;
          vat_status?: VatStatus | null;
          vat_rate?: number | null;
          vatable_sales?: number;
          vat_amount?: number;
          vat_exempt_sales?: number;
          zero_rated_sales?: number;
          device_id?: string | null;
          discount_type?: "percentage" | "flat" | null;
          discount_value?: number | null;
          discount_amount?: number;
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
          {
            foreignKeyName: "sales_device_id_fkey";
            columns: ["device_id"];
            referencedRelation: "devices";
            referencedColumns: ["id"];
          },
        ];
      };
      register_readings: {
        Row: {
          id: string;
          store_id: string;
          kind: "X" | "Z";
          z_counter: number | null;
          reset_counter: number;
          business_date: string;
          opened_at: string;
          closed_at: string;
          grand_total: number;
          gross_sales: number;
          net_sales: number;
          total_discounts: number;
          vatable_sales: number;
          vat_amount: number;
          vat_exempt: number;
          zero_rated: number;
          transaction_count: number;
          voided_count: number;
          voided_total: number;
          refund_count: number;
          refund_total: number;
          beginning_receipt: string | null;
          ending_receipt: string | null;
          payment_breakdown: Json;
          late_entry_count: number;
          late_entry_total: number;
          device_id: string | null;
          taken_by: string;
          created_at: string;
        };
        // No client writes this table: RLS grants no INSERT, and
        // reject_register_reading_mutation() refuses updates and deletes. Both
        // shapes are written out anyway so the Database map stays well-formed
        // -- `never` here makes the whole Tables type unresolvable, which
        // surfaces as unrelated tables inferring `never` elsewhere.
        Insert: {
          id?: string;
          store_id: string;
          kind: "X" | "Z";
          z_counter?: number | null;
          reset_counter?: number;
          business_date: string;
          opened_at: string;
          closed_at?: string;
          grand_total: number;
          gross_sales: number;
          net_sales: number;
          total_discounts: number;
          vatable_sales: number;
          vat_amount: number;
          vat_exempt: number;
          zero_rated: number;
          transaction_count: number;
          voided_count: number;
          voided_total: number;
          refund_count: number;
          refund_total: number;
          beginning_receipt?: string | null;
          ending_receipt?: string | null;
          payment_breakdown?: Json;
          late_entry_count?: number;
          late_entry_total?: number;
          device_id?: string | null;
          taken_by: string;
          created_at?: string;
        };
        Update: {
          beginning_receipt?: string | null;
          ending_receipt?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "register_readings_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "register_readings_device_id_fkey";
            columns: ["device_id"];
            referencedRelation: "devices";
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
          resulting_balance: number | null;
        };
        Insert: {
          id?: string;
          store_id: string;
          customer_id: string;
          amount: number;
          note?: string | null;
          created_by: string;
          created_at?: string;
          resulting_balance?: number | null;
        };
        Update: {
          id?: string;
          store_id?: string;
          customer_id?: string;
          amount?: number;
          note?: string | null;
          created_by?: string;
          created_at?: string;
          resulting_balance?: number | null;
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
      suppliers: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          contact_person: string | null;
          phone: string | null;
          address: string | null;
          scan_code: string;
          payment_terms: string;
          active: boolean;
          usual_delivery_days: number[];
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          name: string;
          contact_person?: string | null;
          phone?: string | null;
          address?: string | null;
          scan_code?: string;
          payment_terms?: string;
          active?: boolean;
          usual_delivery_days?: number[];
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          name?: string;
          contact_person?: string | null;
          phone?: string | null;
          address?: string | null;
          scan_code?: string;
          payment_terms?: string;
          active?: boolean;
          usual_delivery_days?: number[];
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
      supplier_categories: {
        Row: {
          supplier_id: string;
          category_id: string;
        };
        Insert: {
          supplier_id: string;
          category_id: string;
        };
        Update: {
          supplier_id?: string;
          category_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "supplier_categories_supplier_id_fkey";
            columns: ["supplier_id"];
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_categories_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
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
          warehouse_id: string;
          dr_number: string | null;
          paid: boolean;
          paid_at: string | null;
          received_on: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          supplier: string;
          supplier_id?: string | null;
          warehouse_id: string;
          dr_number?: string | null;
          paid?: boolean;
          paid_at?: string | null;
          received_on: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          supplier?: string;
          supplier_id?: string | null;
          warehouse_id?: string;
          dr_number?: string | null;
          paid?: boolean;
          paid_at?: string | null;
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
      feature_flags: {
        Row: { key: string; enabled: boolean; description: string; updated_at: string };
        Insert: { key: string; enabled?: boolean; description?: string; updated_at?: string };
        Update: { key?: string; enabled?: boolean; description?: string; updated_at?: string };
        Relationships: [];
      };
      cashier_sessions: {
        Row: {
          id: string;
          token: string;
          store_id: string;
          staff_id: string;
          created_by: string;
          created_at: string;
          expires_at: string;
          revoked_at: string | null;
          opening_float: number | null;
          closing_float: number | null;
          expected_closing: number | null;
          variance: number | null;
        };
        Insert: {
          id?: string;
          token?: string;
          store_id: string;
          staff_id: string;
          created_by: string;
          created_at?: string;
          expires_at: string;
          revoked_at?: string | null;
          opening_float?: number | null;
          closing_float?: number | null;
          expected_closing?: number | null;
          variance?: number | null;
        };
        Update: {
          id?: string;
          token?: string;
          store_id?: string;
          staff_id?: string;
          created_by?: string;
          created_at?: string;
          expires_at?: string;
          revoked_at?: string | null;
          opening_float?: number | null;
          closing_float?: number | null;
          expected_closing?: number | null;
          variance?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "cashier_sessions_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cashier_sessions_staff_id_fkey";
            columns: ["staff_id"];
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
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
          {
            foreignKeyName: "devices_paired_by_fkey";
            columns: ["paired_by"];
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
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
      audit_log: {
        Row: {
          id: string;
          store_id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          previous_value: Json | null;
          new_value: Json | null;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          previous_value?: Json | null;
          new_value?: Json | null;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          actor_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string;
          previous_value?: Json | null;
          new_value?: Json | null;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_log_actor_id_fkey";
            columns: ["actor_id"];
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      // 20260815131000_refund_return.sql
      refunds: {
        Row: {
          id: string;
          store_id: string;
          sale_id: string;
          actor_id: string | null;
          reason: string;
          total_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          sale_id: string;
          actor_id?: string | null;
          reason: string;
          total_amount?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          sale_id?: string;
          actor_id?: string | null;
          reason?: string;
          total_amount?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "refunds_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refunds_sale_id_fkey";
            columns: ["sale_id"];
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
        ];
      };
      refund_items: {
        Row: {
          id: string;
          store_id: string;
          refund_id: string;
          sale_id: string;
          sale_item_id: string;
          quantity: number;
          amount: number;
        };
        Insert: {
          id?: string;
          store_id: string;
          refund_id: string;
          sale_id: string;
          sale_item_id: string;
          quantity: number;
          amount: number;
        };
        Update: {
          id?: string;
          store_id?: string;
          refund_id?: string;
          sale_id?: string;
          sale_item_id?: string;
          quantity?: number;
          amount?: number;
        };
        Relationships: [
          {
            foreignKeyName: "refund_items_refund_id_fkey";
            columns: ["refund_id"];
            referencedRelation: "refunds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refund_items_sale_id_fkey";
            columns: ["sale_id"];
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refund_items_sale_item_id_fkey";
            columns: ["sale_item_id"];
            referencedRelation: "sale_items";
            referencedColumns: ["id"];
          },
        ];
      };
      // 0044_rbac_foundation.sql
      permissions: {
        Row: { code: string; module_code: string; description: string };
        Insert: { code: string; module_code: string; description: string };
        Update: { code?: string; module_code?: string; description?: string };
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          store_id: string | null;
          code: string;
          name: string;
          is_system: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id?: string | null;
          code: string;
          name: string;
          is_system?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string | null;
          code?: string;
          name?: string;
          is_system?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "roles_store_id_fkey";
            columns: ["store_id"];
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      role_permissions: {
        Row: { role_id: string; permission_code: string };
        Insert: { role_id: string; permission_code: string };
        Update: { role_id?: string; permission_code?: string };
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey";
            columns: ["role_id"];
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_permissions_permission_code_fkey";
            columns: ["permission_code"];
            referencedRelation: "permissions";
            referencedColumns: ["code"];
          },
        ];
      };
      staff_roles: {
        Row: { id: string; staff_id: string; role_id: string; created_at: string };
        Insert: { id?: string; staff_id: string; role_id: string; created_at?: string };
        Update: { id?: string; staff_id?: string; role_id?: string; created_at?: string };
        Relationships: [
          {
            foreignKeyName: "staff_roles_staff_id_fkey";
            columns: ["staff_id"];
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_roles_role_id_fkey";
            columns: ["role_id"];
            referencedRelation: "roles";
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
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          price: number;
          stock: number;
          low_stock_threshold?: number;
          sort_order?: number;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          price?: number;
          stock?: number;
          low_stock_threshold?: number;
          sort_order?: number;
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
          p_services?: { label: string; amount: number; fee?: number; service_type?: "eload" | "cashin" | "cashout" | "print"; cash_handed_over?: number }[];
          p_customer_id?: string | null;
          p_payment_type?: PaymentType;
          p_reference_no?: string | null;
          p_override_pin?: string | null;
          p_cashier_token?: string | null;
          p_client_request_id?: string | null;
          p_occurred_at?: string | null;
          p_is_offline_replay?: boolean;
          p_discount_type?: string | null;
          p_discount_value?: number | null;
          p_override_token?: string | null;
        };
        Returns: { sale_id: string; total: number; receipt_number: string | null }[];
      };
      // 20260815146000_credit_override_pin_lockout.sql
      check_credit_override_pin: {
        Args: {
          p_pin: string;
          p_cashier_token?: string | null;
        };
        Returns: { ok: boolean; error_code: string | null; override_token: string | null }[];
      };
      void_sale: {
        Args: {
          p_sale_id: string;
          p_reason: string;
          p_override_token?: string | null;
        };
        Returns: undefined;
      };
      log_receipt_reprint: {
        Args: {
          p_sale_id: string;
        };
        Returns: undefined;
      };
      log_staff_auth_event: {
        Args: {
          p_action: string;
        };
        Returns: undefined;
      };
      take_reading: {
        Args: {
          p_kind: "X" | "Z";
          p_business_date?: string | null;
        };
        // Written out rather than referencing
        // Database["public"]["Tables"]["register_readings"]["Row"]: that is a
        // self-reference inside the Database type itself, and TypeScript
        // resolves the whole map to never rather than reporting a cycle --
        // which shows up as unrelated tables losing their row types.
        Returns: RegisterReadingRow;
      };
      receive_stock: {
        Args: {
          p_supplier: string;
          p_received_on: string;
          p_lines: Json;
          p_supplier_id?: string | null;
          p_dr_number?: string | null;
        };
        Returns: string;
      };
      report_reconciliation: {
        Args: {
          p_start: string;
          p_end: string;
        };
        Returns: { total: number; transaction_count: number }[];
      };
      refund_sale_items: {
        Args: {
          p_sale_id: string;
          p_reason: string;
          p_items: Json;
        };
        Returns: string;
      };
      record_credit_payment: {
        Args: {
          p_customer_id: string;
          p_amount: number;
          p_note?: string | null;
        };
        Returns: { customer_id: string; new_balance: number }[];
      };
      adjust_product_stock: {
        Args: {
          p_product_id: string;
          p_delta: number;
        };
        Returns: { new_stock: number }[];
      };
      set_own_pin: {
        Args: {
          p_pin: string;
        };
        Returns: undefined;
      };
      admin_set_staff_pin: {
        Args: {
          p_staff_id: string;
          p_pin: string;
        };
        Returns: undefined;
      };
      start_cashier_session: {
        Args: {
          p_staff_id: string;
          p_pin: string;
          p_opening_float: number;
        };
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
        Args: {
          p_token: string;
          p_closing_float?: number | null;
        };
        Returns: undefined;
      };
      generate_pairing_code: {
        Args: Record<string, never>;
        Returns: { code: string; expires_at: string }[];
      };
      list_pickable_cashiers: {
        Args: Record<string, never>;
        Returns: { id: string; name: string; avatar_url: string | null }[];
      };
      admin_unpair_device: {
        Args: {
          p_device_id: string;
          p_owner_pin: string;
        };
        Returns: undefined;
      };
      // 0044_rbac_foundation.sql
      has_permission: {
        Args: { p_code: string; p_staff_id?: string };
        Returns: boolean;
      };
      list_my_permissions: {
        Args: Record<string, never>;
        Returns: string[];
      };
      assign_staff_role: {
        Args: { p_staff_id: string; p_role_code: string };
        Returns: undefined;
      };
      // 20260815100000_grace_and_downgrade_ladder.sql -- the §08 ladder,
      // reached through a public wrapper because `core` is not exposed to
      // PostgREST.
      // 20260815104000_my_store_limits.sql -- takes no argument on purpose:
      // it can only ever answer for the caller's own store.
      // 20260815110000_feature_contracts.sql -- no argument: answers only for
      // auth_store_id().
      my_store_features: {
        Args: Record<string, never>;
        Returns: {
          feature_code: string;
          module_code: string;
          name: string;
          enabled: boolean;
        }[];
      };
      // 20260815120000_set_tier_pricing.sql -- authenticated-gated, not anon:
      // there is no pre-login pricing surface in this app to need it.
      plan_prices: {
        Args: Record<string, never>;
        Returns: {
          plan_code: string;
          name: string;
          description: string | null;
          price_php: number | null;
          billing_interval: string;
          sort_order: number;
          features: string[];
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
      request_plan_upgrade: {
        Args: { p_plan_code: string };
        Returns: undefined;
      };
      request_addon: {
        Args: { p_module_code: string };
        Returns: undefined;
      };
      current_store_has_module: {
        Args: { p_module: string };
        Returns: boolean;
      };
      my_store_limits: {
        Args: Record<string, never>;
        Returns: {
          module_code: string;
          limit_key: string;
          /** null means no ceiling. */
          cap: number | null;
          current_usage: number | null;
        }[];
      };
      my_store_billing_state: {
        Args: Record<string, never>;
        Returns: {
          organization_status: string;
          subscription_status: string;
          writes_allowed: boolean;
          /** Only set while PAST_DUE. */
          grace_ends_at: string | null;
          /** Only set while TRIALING. */
          trial_ends_at: string | null;
        }[];
      };
      start_trial: {
        Args: { p_plan_code: string };
        Returns: undefined;
      };
    };
    Enums: {
      staff_role: StaffRole;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          author_id: string | null
          cohort_id: string
          content: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          author_id?: string | null
          cohort_id: string
          content: string
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          author_id?: string | null
          cohort_id?: string
          content?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      attestation_actions: {
        Row: {
          action: string
          attestation_id: string | null
          created_at: string
          details: string | null
          id: string
          performed_by: string
          user_id: string
        }
        Insert: {
          action: string
          attestation_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          performed_by: string
          user_id: string
        }
        Update: {
          action?: string
          attestation_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          performed_by?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attestation_actions_attestation_id_fkey"
            columns: ["attestation_id"]
            isOneToOne: false
            referencedRelation: "attestations"
            referencedColumns: ["id"]
          },
        ]
      }
      attestations: {
        Row: {
          blocking_reason: string | null
          certificate_number: string
          cohort_id: string
          formation_id: string
          id: string
          issued_at: string
          issued_by: string
          status: string
          user_id: string
        }
        Insert: {
          blocking_reason?: string | null
          certificate_number?: string
          cohort_id: string
          formation_id: string
          id?: string
          issued_at?: string
          issued_by: string
          status?: string
          user_id: string
        }
        Update: {
          blocking_reason?: string | null
          certificate_number?: string
          cohort_id?: string
          formation_id?: string
          id?: string
          issued_at?: string
          issued_by?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attestations_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attestations_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          performed_by: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          performed_by: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          performed_by?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      brief_categories: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      brief_submissions: {
        Row: {
          brief_id: string
          completed_at: string
          created_at: string
          delay_days: number
          id: string
          is_late: boolean
          status: string
          user_id: string
        }
        Insert: {
          brief_id: string
          completed_at?: string
          created_at?: string
          delay_days?: number
          id?: string
          is_late?: boolean
          status?: string
          user_id: string
        }
        Update: {
          brief_id?: string
          completed_at?: string
          created_at?: string
          delay_days?: number
          id?: string
          is_late?: boolean
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brief_submissions_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      briefs: {
        Row: {
          brief_frequency: string | null
          category_id: string | null
          cohort_id: string
          created_at: string
          created_by: string | null
          deadline: string
          description: string | null
          id: string
          publish_at: string
          title: string
          updated_at: string
        }
        Insert: {
          brief_frequency?: string | null
          category_id?: string | null
          cohort_id: string
          created_at?: string
          created_by?: string | null
          deadline: string
          description?: string | null
          id?: string
          publish_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          brief_frequency?: string | null
          category_id?: string | null
          cohort_id?: string
          created_at?: string
          created_by?: string | null
          deadline?: string
          description?: string | null
          id?: string
          publish_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "briefs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "brief_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "briefs_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      cohorts: {
        Row: {
          capacity: number
          cohort_type: string
          created_at: string
          description: string | null
          end_date: string
          formation_id: string | null
          id: string
          name: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          cohort_type?: string
          created_at?: string
          description?: string | null
          end_date: string
          formation_id?: string | null
          id?: string
          name: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          cohort_type?: string
          created_at?: string
          description?: string | null
          end_date?: string
          formation_id?: string | null
          id?: string
          name?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohorts_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          cohort_id: string
          enrolled_at: string
          id: string
          motivation: string | null
          progress: number
          user_id: string
        }
        Insert: {
          cohort_id: string
          enrolled_at?: string
          id?: string
          motivation?: string | null
          progress?: number
          user_id: string
        }
        Update: {
          cohort_id?: string
          enrolled_at?: string
          id?: string
          motivation?: string | null
          progress?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          archived_at: string | null
          category: string
          created_at: string
          created_by: string
          description: string
          expense_date: string
          id: string
          receipt_url: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          archived_at?: string | null
          category: string
          created_at?: string
          created_by: string
          description: string
          expense_date?: string
          id?: string
          receipt_url?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          archived_at?: string | null
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          expense_date?: string
          id?: string
          receipt_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      formations: {
        Row: {
          attestation_body: string | null
          attestation_color: string | null
          attestation_logo_url: string | null
          attestation_signature_url: string | null
          attestation_stamp_url: string | null
          attestation_template: Json | null
          attestation_title: string | null
          created_at: string
          deliverable_description: string | null
          deliverable_label: string
          description: string | null
          duration_days: number
          id: string
          is_active: boolean
          level: string
          name: string
          registration_fee: number
          slug: string
          total_price: number
          updated_at: string
        }
        Insert: {
          attestation_body?: string | null
          attestation_color?: string | null
          attestation_logo_url?: string | null
          attestation_signature_url?: string | null
          attestation_stamp_url?: string | null
          attestation_template?: Json | null
          attestation_title?: string | null
          created_at?: string
          deliverable_description?: string | null
          deliverable_label?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          level?: string
          name: string
          registration_fee?: number
          slug: string
          total_price?: number
          updated_at?: string
        }
        Update: {
          attestation_body?: string | null
          attestation_color?: string | null
          attestation_logo_url?: string | null
          attestation_signature_url?: string | null
          attestation_stamp_url?: string | null
          attestation_template?: Json | null
          attestation_title?: string | null
          created_at?: string
          deliverable_description?: string | null
          deliverable_label?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          level?: string
          name?: string
          registration_fee?: number
          slug?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          created_at: string
          id: string
          image_url: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          sort_order?: number
        }
        Relationships: []
      }
      masterclass_sessions: {
        Row: {
          cohort_id: string
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number
          id: string
          scheduled_at: string
          title: string
          updated_at: string
        }
        Insert: {
          cohort_id: string
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes?: number
          id?: string
          scheduled_at: string
          title: string
          updated_at?: string
        }
        Update: {
          cohort_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          scheduled_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "masterclass_sessions_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          cohort_id: string | null
          content: string
          created_at: string
          id: string
          parent_id: string | null
          recipient_id: string | null
          sender_id: string
          title: string | null
        }
        Insert: {
          cohort_id?: string | null
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          recipient_id?: string | null
          sender_id: string
          title?: string | null
        }
        Update: {
          cohort_id?: string | null
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          recipient_id?: string | null
          sender_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          cohort_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          cohort_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          cohort_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          cohort_id: string
          created_at: string
          deleted_at: string | null
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string
          payment_type: string
          reference: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          cohort_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method: string
          payment_type: string
          reference?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          cohort_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string
          payment_type?: string
          reference?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          admin_notes: string | null
          cohort_id: string
          formation_id: string | null
          id: string
          status: string
          submitted_at: string
          updated_at: string
          url: string
          user_id: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          admin_notes?: string | null
          cohort_id: string
          formation_id?: string | null
          id?: string
          status?: string
          submitted_at?: string
          updated_at?: string
          url: string
          user_id: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          admin_notes?: string | null
          cohort_id?: string
          formation_id?: string | null
          id?: string
          status?: string
          submitted_at?: string
          updated_at?: string
          url?: string
          user_id?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolios_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolios_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promo_code_usage: {
        Row: {
          id: string
          payment_id: string | null
          promo_code_id: string
          used_at: string
          user_id: string
        }
        Insert: {
          id?: string
          payment_id?: string | null
          promo_code_id: string
          used_at?: string
          user_id: string
        }
        Update: {
          id?: string
          payment_id?: string | null
          promo_code_id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_usage_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_usage_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          cohort_id: string | null
          created_at: string
          current_uses: number
          description: string | null
          discount_type: string
          discount_value: number
          early_bird_deadline: string | null
          id: string
          is_active: boolean
          is_early_bird: boolean
          max_uses: number | null
          updated_at: string
        }
        Insert: {
          code: string
          cohort_id?: string | null
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value: number
          early_bird_deadline?: string | null
          id?: string
          is_active?: boolean
          is_early_bird?: boolean
          max_uses?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          cohort_id?: string | null
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          early_bird_deadline?: string | null
          id?: string
          is_active?: boolean
          is_early_bird?: boolean
          max_uses?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          id: string
          subscription: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subscription: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subscription?: Json
          user_id?: string
        }
        Relationships: []
      }
      research_sessions: {
        Row: {
          cohort_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          scheduled_at: string
          title: string
          updated_at: string
        }
        Insert: {
          cohort_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          scheduled_at: string
          title: string
          updated_at?: string
        }
        Update: {
          cohort_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          scheduled_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_sessions_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          cohort_id: string
          created_at: string
          id: string
          title: string
          type: string
          uploaded_by: string | null
          url: string
        }
        Insert: {
          cohort_id: string
          created_at?: string
          id?: string
          title: string
          type: string
          uploaded_by?: string | null
          url: string
        }
        Update: {
          cohort_id?: string
          created_at?: string
          id?: string
          title?: string
          type?: string
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      seen_announcements: {
        Row: {
          announcement_id: string
          id: string
          seen_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          seen_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          seen_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seen_announcements_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          footer_email: string | null
          footer_phone: string | null
          footer_text: string | null
          hero_image_url: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          logo_url: string | null
          updated_at: string
        }
        Insert: {
          footer_email?: string | null
          footer_phone?: string | null
          footer_text?: string | null
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          logo_url?: string | null
          updated_at?: string
        }
        Update: {
          footer_email?: string | null
          footer_phone?: string | null
          footer_text?: string | null
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          logo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      staff_formations: {
        Row: {
          created_at: string
          formation_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          formation_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          formation_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_formations_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          id: string
          notes: string | null
          paid_at: string | null
          period_end: string
          period_start: string
          receipt_url: string | null
          staff_type: string
          staff_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          period_end: string
          period_start: string
          receipt_url?: string | null
          staff_type: string
          staff_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          period_end?: string
          period_start?: string
          receipt_url?: string | null
          staff_type?: string
          staff_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_task_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          task_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          task_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "staff_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_tasks: {
        Row: {
          assigned_by: string
          assigned_to: string
          cohort_id: string | null
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_by: string
          assigned_to: string
          cohort_id?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          assigned_to?: string
          cohort_id?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_tasks_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_cohort_enrollment_count: {
        Args: { cohort_uuid: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "staff" | "student"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "staff", "student"],
    },
  },
} as const

--
-- PostgreSQL database dump
--

\restrict 96MRvkbTicY1esVBDH1KiXZfDo1MsSdKsqnQimXQieN2rXvWk9zgOo5dfCwMUv8

-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: cleanup_expired_locks(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_locks() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM admin_operation_locks 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_old_activity_logs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_activity_logs() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM admin_activity 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_old_concurrent_operations(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_concurrent_operations() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM concurrent_operations 
    WHERE started_at < NOW() - INTERVAL '7 days'
    AND status IN ('completed', 'failed');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


--
-- Name: safe_timestamp_from_ms(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.safe_timestamp_from_ms(ms_value bigint) RETURNS timestamp with time zone
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Handle invalid timestamps (like 1759511381432 which is too large)
    IF ms_value > 4102444800000 THEN -- Year 2100 in milliseconds
        RETURN NULL;
    END IF;
    
    -- Handle timestamps that look like they're already in seconds
    IF ms_value < 10000000000 THEN -- Less than year 2001 in seconds
        RETURN to_timestamp(ms_value);
    END IF;
    
    -- Convert from milliseconds to seconds
    RETURN to_timestamp(ms_value / 1000);
END;
$$;


--
-- Name: trg_forwarding_to_mail_item(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_forwarding_to_mail_item() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE mail_item SET forwarding_status = NEW.status WHERE id = NEW.mail_item_id;
  RETURN NEW;
END;
$$;


--
-- Name: update_blog_posts_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_blog_posts_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_system_metrics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_system_metrics() RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    metrics JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_users', (SELECT COUNT(*) FROM "user" WHERE deleted_at IS NULL),
        'active_users', (SELECT COUNT(*) FROM "user" WHERE deleted_at IS NULL AND last_active_at > EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days') * 1000),
        'total_mail_items', (SELECT COUNT(*) FROM mail_item WHERE deleted = false),
        'pending_forwarding_requests', (SELECT COUNT(*) FROM forwarding_request WHERE status = 'pending'),
        'system_uptime', EXTRACT(EPOCH FROM NOW() - pg_postmaster_start_time()),
        'last_updated', NOW()
    ) INTO metrics;
    
    RETURN metrics;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = EXTRACT(EPOCH FROM NOW())::bigint;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_log (
    id bigint NOT NULL,
    created_at bigint NOT NULL,
    user_id bigint,
    action text NOT NULL,
    details text,
    mail_item_id bigint,
    ip_address text,
    user_agent text
);


--
-- Name: activity_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activity_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activity_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activity_log_id_seq OWNED BY public.activity_log.id;


--
-- Name: address_slot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.address_slot (
    id bigint NOT NULL,
    location_id bigint NOT NULL,
    mailbox_no text NOT NULL,
    status text DEFAULT 'available'::text NOT NULL,
    assigned_to bigint,
    assigned_at timestamp with time zone,
    reserved_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at_ms bigint
);


--
-- Name: address_slot_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.address_slot_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: address_slot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.address_slot_id_seq OWNED BY public.address_slot.id;


--
-- Name: admin_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_activity (
    id integer NOT NULL,
    admin_id integer,
    action text NOT NULL,
    target_type text,
    target_id integer,
    details jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_activity_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_activity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_activity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_activity_id_seq OWNED BY public.admin_activity.id;


--
-- Name: admin_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_audit (
    id bigint NOT NULL,
    admin_id bigint NOT NULL,
    action text NOT NULL,
    target_type text,
    target_id bigint,
    details text,
    created_at bigint NOT NULL
);


--
-- Name: admin_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_audit_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_audit_id_seq OWNED BY public.admin_audit.id;


--
-- Name: admin_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_log (
    id bigint NOT NULL,
    created_at bigint NOT NULL,
    admin_user_id bigint NOT NULL,
    action_type text NOT NULL,
    target_type text,
    target_id bigint,
    details text,
    ip_address text
);


--
-- Name: admin_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_log_id_seq OWNED BY public.admin_log.id;


--
-- Name: admin_operation_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_operation_locks (
    id integer NOT NULL,
    operation_type text NOT NULL,
    resource_id text,
    admin_id integer,
    locked_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_operation_locks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_operation_locks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_operation_locks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_operation_locks_id_seq OWNED BY public.admin_operation_locks.id;


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id bigint NOT NULL,
    entity text NOT NULL,
    entity_id text,
    action text NOT NULL,
    meta jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: blog_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    description text,
    color character varying(7) DEFAULT '#3B82F6'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: blog_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.blog_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: blog_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.blog_categories_id_seq OWNED BY public.blog_categories.id;


--
-- Name: blog_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_posts (
    id integer NOT NULL,
    slug character varying(255) NOT NULL,
    title character varying(500) NOT NULL,
    excerpt text NOT NULL,
    content text NOT NULL,
    category character varying(100) NOT NULL,
    image_url character varying(500),
    read_time character varying(20) DEFAULT '5 min read'::character varying,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by integer,
    updated_by integer,
    status character varying(20) DEFAULT 'draft'::character varying,
    featured boolean DEFAULT false,
    seo_title character varying(500),
    seo_description text,
    seo_keywords text[],
    author_name text DEFAULT 'Liban Adan'::text,
    author_title text DEFAULT 'Founder, VirtualAddressHub'::text,
    author_image text DEFAULT '/images/authors/liban.jpg'::text,
    description text,
    date text,
    updated text,
    tags text,
    cover text,
    og_title text,
    og_desc text,
    noindex text,
    CONSTRAINT blog_posts_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'archived'::character varying])::text[])))
);


--
-- Name: TABLE blog_posts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.blog_posts IS 'Blog posts stored in database for persistence across deployments';


--
-- Name: COLUMN blog_posts.author_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_posts.author_name IS 'Author name displayed on blog post';


--
-- Name: COLUMN blog_posts.author_title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_posts.author_title IS 'Author title/role displayed on blog post';


--
-- Name: COLUMN blog_posts.author_image; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.blog_posts.author_image IS 'Author profile image URL';


--
-- Name: blog_posts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.blog_posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: blog_posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.blog_posts_id_seq OWNED BY public.blog_posts.id;


--
-- Name: business; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    company_name text NOT NULL,
    trading_name text,
    companies_house_number text,
    status text DEFAULT 'active'::text NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    monthly_price_pence integer DEFAULT 999 NOT NULL,
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL
);


--
-- Name: TABLE business; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.business IS 'Business entities under a user account; each has its own name, CH number, and (via business_id) mail/verification';


--
-- Name: COLUMN business.is_primary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.business.is_primary IS 'Exactly one per user; used as default context in UI';


--
-- Name: COLUMN business.monthly_price_pence; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.business.monthly_price_pence IS 'Display price for this business: first = 999, then -100 each, floor 599';


--
-- Name: business_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.business_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: business_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.business_id_seq OWNED BY public.business.id;


--
-- Name: business_owner; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_owner (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    sumsub_applicant_id text,
    status text DEFAULT 'not_started'::text NOT NULL,
    kyc_updated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    role text NOT NULL,
    requires_verification boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE business_owner; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.business_owner IS 'Additional directors/owners/PSCs who need identity verification (no VAH account)';


--
-- Name: COLUMN business_owner.sumsub_applicant_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.business_owner.sumsub_applicant_id IS 'Sumsub applicant ID for identity verification';


--
-- Name: COLUMN business_owner.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.business_owner.status IS 'Verification status: not_started | pending | verified | rejected';


--
-- Name: COLUMN business_owner.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.business_owner.role IS 'Role of the person: director | psc';


--
-- Name: COLUMN business_owner.requires_verification; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.business_owner.requires_verification IS 'Whether this person must complete Sumsub verification before address access';


--
-- Name: business_owner_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.business_owner_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: business_owner_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.business_owner_id_seq OWNED BY public.business_owner.id;


--
-- Name: business_owner_invite; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_owner_invite (
    id bigint NOT NULL,
    business_owner_id bigint NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    last_sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE business_owner_invite; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.business_owner_invite IS 'Invite tokens for business owner identity verification';


--
-- Name: COLUMN business_owner_invite.token_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.business_owner_invite.token_hash IS 'SHA-256 hash of the invite token (never store raw token)';


--
-- Name: COLUMN business_owner_invite.used_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.business_owner_invite.used_at IS 'Timestamp when the invite was used to start verification';


--
-- Name: business_owner_invite_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.business_owner_invite_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: business_owner_invite_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.business_owner_invite_id_seq OWNED BY public.business_owner_invite.id;


--
-- Name: charge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.charge (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id bigint NOT NULL,
    amount_pence integer NOT NULL,
    currency text DEFAULT 'GBP'::text NOT NULL,
    type text NOT NULL,
    description text NOT NULL,
    service_date date NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    invoice_id bigint,
    related_type text,
    related_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    billed_at timestamp with time zone
);


--
-- Name: TABLE charge; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.charge IS 'Billable charges (forwarding fees, etc.) that roll into monthly invoices.';


--
-- Name: COLUMN charge.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.charge.type IS 'Type of charge: forwarding_fee, etc.';


--
-- Name: COLUMN charge.service_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.charge.service_date IS 'Date when the service was provided (used for period matching)';


--
-- Name: COLUMN charge.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.charge.status IS 'pending: not yet billed, billed: included in invoice, void: cancelled';


--
-- Name: COLUMN charge.related_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.charge.related_type IS 'Type of related entity: forwarding_request, etc.';


--
-- Name: COLUMN charge.related_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.charge.related_id IS 'ID of the related entity (e.g., forwarding_request.id). Unique constraint on (type, related_type, related_id) prevents duplicate charges if webhook/job retries';


--
-- Name: concurrent_operations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.concurrent_operations (
    id integer NOT NULL,
    operation_type text NOT NULL,
    resource_id text,
    user_id integer,
    status text DEFAULT 'running'::text,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: concurrent_operations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.concurrent_operations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: concurrent_operations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.concurrent_operations_id_seq OWNED BY public.concurrent_operations.id;


--
-- Name: destruction_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.destruction_log (
    id integer NOT NULL,
    mail_item_id integer NOT NULL,
    user_id integer NOT NULL,
    user_display_name text NOT NULL,
    receipt_date date NOT NULL,
    eligibility_date date NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    destruction_status text DEFAULT 'completed'::text NOT NULL,
    actor_type text NOT NULL,
    action_source text NOT NULL,
    staff_user_id integer,
    staff_name text NOT NULL,
    staff_initials text NOT NULL,
    notes text NOT NULL,
    destruction_method text DEFAULT 'Cross-cut shredder'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT admin_action_requires_staff_user CHECK ((((actor_type = 'admin'::text) AND (staff_user_id IS NOT NULL)) OR ((actor_type = 'system'::text) AND (staff_user_id IS NULL)))),
    CONSTRAINT destruction_log_action_source_check CHECK ((action_source = ANY (ARRAY['admin_ui'::text, 'scheduled_job'::text, 'api'::text]))),
    CONSTRAINT destruction_log_actor_type_check CHECK ((actor_type = ANY (ARRAY['admin'::text, 'system'::text]))),
    CONSTRAINT destruction_log_destruction_status_check CHECK ((destruction_status = ANY (ARRAY['scheduled'::text, 'completed'::text]))),
    CONSTRAINT destruction_log_staff_initials_check CHECK (((staff_initials <> 'UN'::text) AND (staff_initials <> ''::text))),
    CONSTRAINT destruction_log_staff_name_check CHECK (((staff_name <> 'Unknown'::text) AND (staff_name <> ''::text)))
);


--
-- Name: TABLE destruction_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.destruction_log IS 'Audit trail for physical mail destruction. Required for HMRC AML and GDPR compliance. Every record must be attributable to a specific admin or system actor.';


--
-- Name: COLUMN destruction_log.eligibility_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.destruction_log.eligibility_date IS 'Date when destruction became eligible (receipt_date + retention_days). Destruction should not occur before this date.';


--
-- Name: COLUMN destruction_log.actor_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.destruction_log.actor_type IS 'Type of actor: "admin" (manual action by authenticated admin) or "system" (automated job).';


--
-- Name: COLUMN destruction_log.action_source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.destruction_log.action_source IS 'Source of the action: "admin_ui" (admin dashboard), "scheduled_job" (automated), or "api" (programmatic).';


--
-- Name: COLUMN destruction_log.staff_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.destruction_log.staff_user_id IS 'ID of admin user who performed destruction. NULL only for system actions.';


--
-- Name: COLUMN destruction_log.staff_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.destruction_log.staff_name IS 'Full name of staff who performed/authorized destruction. Must be "System (Automated)" for system actions, or admin full name for manual actions. NEVER "Unknown".';


--
-- Name: COLUMN destruction_log.staff_initials; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.destruction_log.staff_initials IS 'Initials of staff (e.g., "SYS" for system, "JD" for John Doe). NEVER "UN".';


--
-- Name: COLUMN destruction_log.notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.destruction_log.notes IS 'Factual explanation of WHY destruction occurred (e.g., "30-day retention expired with no forwarding request").';


--
-- Name: destruction_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.destruction_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: destruction_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.destruction_log_id_seq OWNED BY public.destruction_log.id;


--
-- Name: download; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.download (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    file_id bigint,
    download_url text NOT NULL,
    expires_at bigint NOT NULL,
    created_at bigint NOT NULL,
    ip_address text,
    user_agent text
);


--
-- Name: TABLE download; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.download IS 'Tracks mail scan download requests for audit and access control';


--
-- Name: download_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.download_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: download_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.download_id_seq OWNED BY public.download.id;


--
-- Name: email_change_request; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_change_request (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    new_email text NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_sent_at timestamp with time zone
);


--
-- Name: TABLE email_change_request; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.email_change_request IS 'Stores pending email change requests. Tokens are hashed (SHA-256) before storage.';


--
-- Name: COLUMN email_change_request.token_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.email_change_request.token_hash IS 'SHA-256 hash of the verification token. Original token is never stored.';


--
-- Name: COLUMN email_change_request.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.email_change_request.expires_at IS 'Token expires 30 minutes after creation. Requests older than this cannot be confirmed.';


--
-- Name: COLUMN email_change_request.used_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.email_change_request.used_at IS 'Timestamp when the token was successfully used. NULL means pending.';


--
-- Name: COLUMN email_change_request.last_sent_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.email_change_request.last_sent_at IS 'Timestamp when the confirmation email was last sent. Used for rate limiting resends (60 seconds minimum).';


--
-- Name: email_change_request_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_change_request_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_change_request_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_change_request_id_seq OWNED BY public.email_change_request.id;


--
-- Name: email_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_preferences (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    email_unsubscribed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: email_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_preferences_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_preferences_id_seq OWNED BY public.email_preferences.id;


--
-- Name: export_job; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.export_job (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    finished_at timestamp with time zone,
    status text DEFAULT 'pending'::text NOT NULL,
    type text,
    kind text,
    params jsonb DEFAULT '{}'::jsonb NOT NULL,
    file_path text,
    file_size bigint,
    error text,
    error_message text,
    user_id bigint,
    token text,
    expires_at bigint,
    storage_expires_at bigint GENERATED ALWAYS AS (expires_at) STORED,
    created_at_ms bigint,
    started_at_ms bigint,
    completed_at_ms bigint,
    finished_at_ms bigint,
    CONSTRAINT export_job_status_chk CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'done'::text, 'failed'::text])))
);


--
-- Name: export_job_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.export_job_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: export_job_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.export_job_id_seq OWNED BY public.export_job.id;


--
-- Name: file; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.file (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    mail_item_id bigint,
    drive_id text,
    item_id text,
    path text,
    name text,
    size bigint DEFAULT 0,
    mime text,
    etag text,
    modified_at bigint,
    web_url text,
    deleted boolean DEFAULT false,
    created_at bigint NOT NULL,
    updated_at bigint
);


--
-- Name: file_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.file_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: file_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.file_id_seq OWNED BY public.file.id;


--
-- Name: forwarding_charge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forwarding_charge (
    id integer NOT NULL,
    forwarding_request_id integer,
    amount_pence integer DEFAULT 200,
    status text DEFAULT 'pending'::text,
    created_at bigint NOT NULL,
    updated_at bigint
);


--
-- Name: TABLE forwarding_charge; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.forwarding_charge IS 'Tracks £2 forwarding charges for non-HMRC/Companies House mail';


--
-- Name: forwarding_charge_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.forwarding_charge_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: forwarding_charge_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.forwarding_charge_id_seq OWNED BY public.forwarding_charge.id;


--
-- Name: forwarding_outbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forwarding_outbox (
    id integer NOT NULL,
    forwarding_request_id integer,
    event text,
    payload_json text,
    status text DEFAULT 'pending'::text,
    attempt_count integer DEFAULT 0,
    last_error text,
    next_attempt_at bigint,
    created_at bigint NOT NULL,
    updated_at bigint
);


--
-- Name: TABLE forwarding_outbox; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.forwarding_outbox IS 'Outbox pattern for retryable forwarding events';


--
-- Name: forwarding_outbox_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.forwarding_outbox_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: forwarding_outbox_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.forwarding_outbox_id_seq OWNED BY public.forwarding_outbox.id;


--
-- Name: forwarding_request; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forwarding_request (
    id integer NOT NULL,
    created_at bigint NOT NULL,
    user_id integer,
    mail_item_id integer,
    status text DEFAULT 'Requested'::text,
    to_name text,
    address1 text,
    address2 text,
    city text,
    state text,
    postal text,
    country text,
    reason text,
    method text,
    idem_key text,
    updated_at bigint,
    tracking text,
    courier text,
    reviewed_at bigint,
    reviewed_by integer,
    processing_at bigint,
    dispatched_at bigint,
    delivered_at bigint,
    cancelled_at bigint,
    tracking_number text,
    admin_notes text,
    item_id bigint
);


--
-- Name: TABLE forwarding_request; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.forwarding_request IS 'Enhanced forwarding requests with full address details and state management';


--
-- Name: forwarding_request_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.forwarding_request_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: forwarding_request_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.forwarding_request_id_seq OWNED BY public.forwarding_request.id;


--
-- Name: gc_billing_request_flow; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gc_billing_request_flow (
    id bigint NOT NULL,
    created_at_ms bigint NOT NULL,
    user_id bigint NOT NULL,
    plan_id bigint NOT NULL,
    billing_request_id text NOT NULL,
    billing_request_flow_id text NOT NULL,
    customer_id text,
    status text DEFAULT 'created'::text NOT NULL,
    completed_at_ms bigint
);


--
-- Name: gc_billing_request_flow_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gc_billing_request_flow_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gc_billing_request_flow_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gc_billing_request_flow_id_seq OWNED BY public.gc_billing_request_flow.id;


--
-- Name: gc_redirect_flow; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gc_redirect_flow (
    id bigint NOT NULL,
    created_at_ms bigint NOT NULL,
    user_id bigint NOT NULL,
    plan_id bigint NOT NULL,
    flow_id text NOT NULL,
    session_token text,
    status text DEFAULT 'created'::text NOT NULL,
    completed_at_ms bigint
);


--
-- Name: gc_redirect_flow_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gc_redirect_flow_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gc_redirect_flow_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gc_redirect_flow_id_seq OWNED BY public.gc_redirect_flow.id;


--
-- Name: invoice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    invoice_number text NOT NULL,
    amount_pence bigint NOT NULL,
    period_start text NOT NULL,
    period_end text NOT NULL,
    pdf_path text NOT NULL,
    status text DEFAULT 'paid'::text,
    created_at bigint NOT NULL
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    invoice_number text NOT NULL,
    amount_pence bigint NOT NULL,
    period_start text NOT NULL,
    period_end text NOT NULL,
    pdf_path text,
    status text DEFAULT 'paid'::text,
    created_at bigint NOT NULL,
    number text NOT NULL,
    gocardless_payment_id text,
    currency text DEFAULT 'GBP'::text,
    email_sent_at timestamp with time zone,
    email_send_error text,
    stripe_invoice_id text,
    stripe_payment_intent_id text,
    billing_interval text
);


--
-- Name: COLUMN invoices.period_start; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.period_start IS 'Start date of billing period';


--
-- Name: COLUMN invoices.period_end; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.period_end IS 'End date of billing period';


--
-- Name: COLUMN invoices.pdf_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.pdf_path IS 'Relative path to generated PDF invoice';


--
-- Name: COLUMN invoices.gocardless_payment_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.gocardless_payment_id IS 'GoCardless payment ID that triggered this invoice';


--
-- Name: COLUMN invoices.email_sent_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.email_sent_at IS 'Timestamp when the invoice email was successfully sent. NULL means not sent yet.';


--
-- Name: COLUMN invoices.email_send_error; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.email_send_error IS 'Error message if email sending failed. NULL if sent successfully or not attempted yet.';


--
-- Name: COLUMN invoices.stripe_invoice_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.stripe_invoice_id IS 'Stripe invoice ID for idempotent webhook handling';


--
-- Name: COLUMN invoices.stripe_payment_intent_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.stripe_payment_intent_id IS 'Stripe payment intent ID when paid via Stripe';


--
-- Name: invoice_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoice_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invoice_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invoice_id_seq OWNED BY public.invoices.id;


--
-- Name: invoice_id_seq1; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoice_id_seq1
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invoice_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invoice_id_seq1 OWNED BY public.invoice.id;


--
-- Name: invoice_seq; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_seq (
    id bigint NOT NULL,
    year bigint NOT NULL,
    sequence bigint DEFAULT 0 NOT NULL,
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL
);


--
-- Name: invoices_seq; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices_seq (
    id bigint NOT NULL,
    year bigint NOT NULL,
    sequence bigint DEFAULT 0 NOT NULL,
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL
);


--
-- Name: invoice_seq_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoice_seq_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invoice_seq_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invoice_seq_id_seq OWNED BY public.invoices_seq.id;


--
-- Name: invoice_seq_id_seq1; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoice_seq_id_seq1
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invoice_seq_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invoice_seq_id_seq1 OWNED BY public.invoice_seq.id;


--
-- Name: invoice_token; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_token (
    id bigint NOT NULL,
    invoice_id bigint NOT NULL,
    token text NOT NULL,
    expires_at text NOT NULL,
    used_at text,
    created_at bigint NOT NULL,
    created_at_ms bigint,
    expires_at_ms bigint,
    used_at_ms bigint,
    created_at_ts timestamp with time zone GENERATED ALWAYS AS (to_timestamp((((created_at_ms)::numeric / 1000.0))::double precision)) STORED,
    expires_at_ts timestamp with time zone GENERATED ALWAYS AS (to_timestamp((((expires_at_ms)::numeric / 1000.0))::double precision)) STORED,
    used_at_ts timestamp with time zone GENERATED ALWAYS AS (to_timestamp((((used_at_ms)::numeric / 1000.0))::double precision)) STORED
);


--
-- Name: invoice_token_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoice_token_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invoice_token_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invoice_token_id_seq OWNED BY public.invoice_token.id;


--
-- Name: kyc_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kyc_status (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    sumsub_applicant_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: kyc_status_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kyc_status_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kyc_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kyc_status_id_seq OWNED BY public.kyc_status.id;


--
-- Name: location; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.location (
    id bigint NOT NULL,
    name text NOT NULL,
    line1 text NOT NULL,
    line2 text,
    city text NOT NULL,
    postcode text NOT NULL,
    country text DEFAULT 'United Kingdom'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: location_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.location_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: location_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.location_id_seq OWNED BY public.location.id;


--
-- Name: mail_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mail_event (
    id bigint NOT NULL,
    created_at bigint NOT NULL,
    mail_item bigint NOT NULL,
    actor_user bigint,
    event_type text NOT NULL,
    details text
);


--
-- Name: mail_event_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mail_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mail_event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mail_event_id_seq OWNED BY public.mail_event.id;


--
-- Name: mail_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mail_item (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    subject text,
    sender_name text,
    received_date text,
    scan_file_url text,
    file_size bigint DEFAULT 0,
    forwarded_physically boolean DEFAULT false,
    notes text,
    forwarded_date text,
    forward_reason text,
    scanned boolean DEFAULT false,
    deleted boolean DEFAULT false,
    tag text,
    is_billable_forward boolean DEFAULT false,
    admin_note text,
    deleted_by_admin boolean DEFAULT false,
    action_log text,
    scanned_at bigint,
    status text DEFAULT 'received'::text,
    requested_at bigint,
    physical_receipt_timestamp bigint,
    physical_dispatch_timestamp bigint,
    tracking_number text,
    updated_at bigint,
    created_at bigint NOT NULL,
    idempotency_key text,
    file_id bigint,
    expires_at bigint,
    forwarding_status text DEFAULT 'No'::text,
    updated_by bigint,
    is_read boolean DEFAULT false,
    received_at_ms bigint,
    forwarded_at_ms bigint,
    received_at_ts timestamp with time zone GENERATED ALWAYS AS (to_timestamp((((received_at_ms)::numeric / 1000.0))::double precision)) STORED,
    forwarded_at_ts timestamp with time zone GENERATED ALWAYS AS (to_timestamp((((forwarded_at_ms)::numeric / 1000.0))::double precision)) STORED,
    business_id bigint NOT NULL,
    mail_type text,
    description text,
    mailroom_expiry_notified_at bigint,
    locked boolean DEFAULT false NOT NULL,
    locked_reason text,
    physical_destruction_date timestamp with time zone,
    destruction_logged boolean DEFAULT false,
    source_slug text,
    file_url text,
    public_url text,
    item_id text,
    CONSTRAINT check_mail_item_has_receipt_date CHECK (((received_at_ms IS NOT NULL) OR ((received_date IS NOT NULL) AND (received_date <> ''::text)) OR (created_at IS NOT NULL)))
);


--
-- Name: COLUMN mail_item.is_read; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mail_item.is_read IS 'Whether the user has read/viewed this mail item';


--
-- Name: COLUMN mail_item.business_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mail_item.business_id IS 'Required: business this mail belongs to (set on create, backfilled in 127/128)';


--
-- Name: COLUMN mail_item.mail_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mail_item.mail_type IS 'Optional: letter/bill/etc. from ingest-time AI (gpt-4o-mini)';


--
-- Name: COLUMN mail_item.mailroom_expiry_notified_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mail_item.mailroom_expiry_notified_at IS 'Timestamp (ms since epoch) when mailroom was notified about 30-day expiry. NULL means not yet notified.';


--
-- Name: COLUMN mail_item.locked; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mail_item.locked IS 'If true, this mail item was ingested while user plan/status/kyc was inactive. Item is created but locked from user access.';


--
-- Name: COLUMN mail_item.locked_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mail_item.locked_reason IS 'Reason for locking: plan_inactive, user_inactive, kyc_not_approved, etc.';


--
-- Name: mail_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mail_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mail_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mail_item_id_seq OWNED BY public.mail_item.id;


--
-- Name: password_reset; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    token text NOT NULL,
    created_at bigint NOT NULL,
    used_at bigint
);


--
-- Name: password_reset_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.password_reset_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: password_reset_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.password_reset_id_seq OWNED BY public.password_reset.id;


--
-- Name: payment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment (
    id integer NOT NULL,
    created_at bigint NOT NULL,
    user_id integer,
    gocardless_customer_id text,
    subscription_id text,
    status text,
    invoice_url text,
    mandate_id text,
    billing_interval text
);


--
-- Name: payment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_id_seq OWNED BY public.payment.id;


--
-- Name: plan_price_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_price_history (
    id bigint NOT NULL,
    plan_id bigint NOT NULL,
    price_pence bigint NOT NULL,
    currency text DEFAULT 'GBP'::text NOT NULL,
    effective_at text DEFAULT (now())::text NOT NULL,
    note text
);


--
-- Name: plan_price_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.plan_price_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: plan_price_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.plan_price_history_id_seq OWNED BY public.plan_price_history.id;


--
-- Name: plan_status_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_status_event (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    subscription_id bigint,
    old_status text,
    new_status text NOT NULL,
    reason text NOT NULL,
    gocardless_event_id text,
    gocardless_event_type text,
    gocardless_event_created_at timestamp with time zone,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE plan_status_event; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.plan_status_event IS 'Audit trail for every plan status change. Every time plan_status changes, a row is inserted here.';


--
-- Name: COLUMN plan_status_event.reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plan_status_event.reason IS 'Human-readable reason for the status change (e.g., "webhook_mandate_active", "webhook_payment_failed")';


--
-- Name: COLUMN plan_status_event.gocardless_event_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plan_status_event.gocardless_event_id IS 'ID of the GoCardless webhook event that triggered this change (if applicable)';


--
-- Name: plan_status_event_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.plan_status_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: plan_status_event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.plan_status_event_id_seq OWNED BY public.plan_status_event.id;


--
-- Name: plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plans (
    id bigint NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    price_pence bigint NOT NULL,
    "interval" text NOT NULL,
    currency text DEFAULT 'GBP'::text NOT NULL,
    features_json text DEFAULT '[]'::text NOT NULL,
    active boolean DEFAULT false NOT NULL,
    vat_inclusive boolean DEFAULT true NOT NULL,
    trial_days bigint DEFAULT 0 NOT NULL,
    sort bigint DEFAULT 0 NOT NULL,
    effective_at text,
    retired_at text,
    created_at text DEFAULT (now())::text NOT NULL,
    updated_at text DEFAULT (now())::text NOT NULL,
    amount_pence integer DEFAULT 0 NOT NULL,
    created_at_ms bigint,
    updated_at_ms bigint,
    effective_at_ms bigint,
    retired_at_ms bigint,
    created_at_ts timestamp with time zone GENERATED ALWAYS AS (to_timestamp((((created_at_ms)::numeric / 1000.0))::double precision)) STORED,
    updated_at_ts timestamp with time zone GENERATED ALWAYS AS (to_timestamp((((updated_at_ms)::numeric / 1000.0))::double precision)) STORED,
    effective_at_ts timestamp with time zone GENERATED ALWAYS AS (to_timestamp((((effective_at_ms)::numeric / 1000.0))::double precision)) STORED,
    retired_at_ts timestamp with time zone GENERATED ALWAYS AS (to_timestamp((((retired_at_ms)::numeric / 1000.0))::double precision)) STORED,
    billing_cycle text,
    billing_interval text,
    CONSTRAINT plans_billing_interval_chk CHECK ((billing_interval = ANY (ARRAY['day'::text, 'week'::text, 'month'::text, 'year'::text]))),
    CONSTRAINT plans_interval_check CHECK (("interval" = ANY (ARRAY['month'::text, 'year'::text]))),
    CONSTRAINT plans_price_pence_check CHECK ((price_pence >= 0))
);


--
-- Name: plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.plans_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.plans_id_seq OWNED BY public.plans.id;


--
-- Name: quiz_leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_leads (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text,
    email text NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    answers jsonb,
    segment text DEFAULT 'low'::text NOT NULL,
    source text DEFAULT 'compliance-check'::text,
    quiz_id text,
    CONSTRAINT email_not_empty CHECK ((email <> ''::text)),
    CONSTRAINT quiz_leads_segment_check CHECK ((segment = ANY (ARRAY['high'::text, 'mid'::text, 'low'::text])))
);


--
-- Name: TABLE quiz_leads; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.quiz_leads IS 'Stores compliance check quiz submissions with scores and segmentation';


--
-- Name: quiz_leads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quiz_leads_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quiz_leads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quiz_leads_id_seq OWNED BY public.quiz_leads.id;


--
-- Name: scan_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scan_tokens (
    id bigint NOT NULL,
    token text NOT NULL,
    mail_item_id bigint NOT NULL,
    issued_to bigint,
    expires_at text NOT NULL,
    used boolean DEFAULT false NOT NULL,
    created_at text DEFAULT (now())::text NOT NULL,
    created_at_ms bigint,
    expires_at_ms bigint,
    created_at_ts timestamp with time zone GENERATED ALWAYS AS (to_timestamp((((created_at_ms)::numeric / 1000.0))::double precision)) STORED,
    expires_at_ts timestamp with time zone GENERATED ALWAYS AS (to_timestamp((((expires_at_ms)::numeric / 1000.0))::double precision)) STORED
);


--
-- Name: scan_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scan_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scan_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scan_tokens_id_seq OWNED BY public.scan_tokens.id;


--
-- Name: subscription; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription (
    id integer NOT NULL,
    user_id integer NOT NULL,
    plan_name text DEFAULT 'Digital Mailbox Plan'::text NOT NULL,
    cadence text DEFAULT 'monthly'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    next_charge_at bigint,
    mandate_id text,
    created_at bigint DEFAULT ((EXTRACT(epoch FROM now()) * (1000)::numeric))::bigint NOT NULL,
    updated_at bigint DEFAULT ((EXTRACT(epoch FROM now()) * (1000)::numeric))::bigint NOT NULL,
    last_event_created_at timestamp with time zone,
    last_event_id text,
    customer_id text,
    stripe_subscription_id text,
    CONSTRAINT subscription_active_requires_mandate CHECK (((status <> 'active'::text) OR (mandate_id IS NOT NULL)))
);


--
-- Name: COLUMN subscription.last_event_created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription.last_event_created_at IS 'Timestamp of the most recent GoCardless webhook event that updated this subscription. Used to prevent stale/out-of-order events from overwriting newer state.';


--
-- Name: COLUMN subscription.last_event_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription.last_event_id IS 'ID of the most recent GoCardless webhook event that updated this subscription. Used for audit and debugging.';


--
-- Name: COLUMN subscription.stripe_subscription_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription.stripe_subscription_id IS 'Stripe subscription ID when BILLING_PROVIDER=stripe';


--
-- Name: CONSTRAINT subscription_active_requires_mandate ON subscription; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT subscription_active_requires_mandate ON public.subscription IS 'Ensures that a subscription cannot be active without a mandate. This prevents impossible states that lead to confusion.';


--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscription_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscription_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscription_id_seq OWNED BY public.subscription.id;


--
-- Name: support_ticket; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_ticket (
    id integer NOT NULL,
    user_id integer,
    subject text NOT NULL,
    message text,
    category text DEFAULT 'general'::text,
    priority text DEFAULT 'normal'::text,
    status text DEFAULT 'open'::text,
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL
);


--
-- Name: support_ticket_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.support_ticket_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: support_ticket_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.support_ticket_id_seq OWNED BY public.support_ticket.id;


--
-- Name: usage_charges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_charges (
    id integer NOT NULL,
    user_id integer NOT NULL,
    period_yyyymm text NOT NULL,
    type text NOT NULL,
    qty integer DEFAULT 1 NOT NULL,
    amount_pence integer DEFAULT 0 NOT NULL,
    notes text,
    created_at bigint NOT NULL
);


--
-- Name: usage_charges_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usage_charges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usage_charges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usage_charges_id_seq OWNED BY public.usage_charges.id;


--
-- Name: user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."user" (
    id bigint NOT NULL,
    email text NOT NULL,
    name text,
    password text,
    first_name text,
    last_name text,
    is_admin boolean DEFAULT false NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    kyc_status text DEFAULT 'pending'::text,
    plan_status text DEFAULT 'active'::text,
    plan_start_date bigint,
    onboarding_step text DEFAULT 'signup'::text,
    email_verified boolean DEFAULT false,
    email_verified_at bigint,
    status text DEFAULT 'active'::text,
    login_attempts integer DEFAULT 0,
    locked_until bigint,
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL,
    last_active_at bigint,
    deleted_at bigint,
    plan_id bigint,
    last_login_at bigint,
    companies_house_verified boolean DEFAULT false NOT NULL,
    ch_verification_proof_url text,
    kyc_approved_at timestamp with time zone,
    ch_reminder_last_sent_at timestamp with time zone,
    ch_verification_status text DEFAULT 'not_submitted'::text NOT NULL,
    ch_verification_submitted_at timestamp with time zone,
    ch_verification_reviewed_at timestamp with time zone,
    ch_verification_reviewer_id integer,
    ch_verification_notes text,
    gocardless_customer_id text,
    gocardless_mandate_id text,
    gocardless_redirect_flow_id text,
    kyc_verified_at bigint,
    email_pref_marketing boolean DEFAULT false NOT NULL,
    email_pref_product boolean DEFAULT true NOT NULL,
    email_pref_system boolean DEFAULT true NOT NULL,
    kyc_verified_at_ms bigint,
    kyc_rejection_reason text,
    companies_house_number text,
    company_number text,
    sumsub_applicant_id text,
    sumsub_review_status text,
    sumsub_last_updated bigint,
    sumsub_rejection_reason text,
    sumsub_webhook_payload text,
    email_bounced_at timestamp with time zone,
    reset_token_lookup_hash text,
    forwarding_address text,
    payment_failed_at bigint,
    payment_retry_count integer DEFAULT 0,
    payment_grace_until bigint,
    account_suspended_at bigint,
    is_sole_controller boolean NOT NULL,
    additional_controllers_count integer,
    controllers_declared_at timestamp with time zone,
    owners_pending_info boolean DEFAULT false NOT NULL,
    stripe_customer_id text,
    stripe_default_payment_method_id text,
    email_unsubscribed_at timestamp with time zone,
    state text,
    phone text,
    business_type text,
    country_of_incorporation text,
    company_name text,
    forward_to_first_name text,
    forward_to_last_name text,
    address_line1 text,
    address_line2 text,
    city text,
    postcode text,
    forward_country text,
    billing text,
    price text,
    suspended_at timestamp with time zone,
    postal_code text,
    country text,
    subscription_status text,
    reset_token_hash text,
    reset_token_expires_at timestamp with time zone,
    reset_token_used_at bigint,
    is_staff boolean,
    expires_at bigint,
    password_hash text,
    CONSTRAINT check_controllers_declaration CHECK (((is_sole_controller IS NULL) OR ((is_sole_controller = true) AND ((additional_controllers_count IS NULL) OR (additional_controllers_count = 0))) OR ((is_sole_controller = false) AND ((additional_controllers_count IS NULL) OR (additional_controllers_count >= 1)))))
);


--
-- Name: COLUMN "user".gocardless_customer_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".gocardless_customer_id IS 'GoCardless customer ID for payment processing';


--
-- Name: COLUMN "user".gocardless_mandate_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".gocardless_mandate_id IS 'GoCardless mandate ID for direct debit';


--
-- Name: COLUMN "user".gocardless_redirect_flow_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".gocardless_redirect_flow_id IS 'Temporary ID for GoCardless payment setup flow';


--
-- Name: COLUMN "user".kyc_verified_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".kyc_verified_at IS 'Timestamp (ms) when KYC verification was completed';


--
-- Name: COLUMN "user".email_pref_marketing; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".email_pref_marketing IS 'Marketing emails opt-in';


--
-- Name: COLUMN "user".email_pref_product; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".email_pref_product IS 'Product updates opt-in';


--
-- Name: COLUMN "user".email_pref_system; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".email_pref_system IS 'System notifications opt-in';


--
-- Name: COLUMN "user".kyc_verified_at_ms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".kyc_verified_at_ms IS 'KYC verified timestamp in ms';


--
-- Name: COLUMN "user".kyc_rejection_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".kyc_rejection_reason IS 'Reason if KYC was rejected';


--
-- Name: COLUMN "user".companies_house_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".companies_house_number IS 'Companies House registration number; used by profile and CH verification.';


--
-- Name: COLUMN "user".company_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".company_number IS 'Companies House number set at signup; profile also uses companies_house_number (set later).';


--
-- Name: COLUMN "user".forwarding_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".forwarding_address IS 'User''s forwarding address for mail forwarding requests';


--
-- Name: COLUMN "user".payment_failed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".payment_failed_at IS 'Timestamp when payment first failed';


--
-- Name: COLUMN "user".payment_retry_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".payment_retry_count IS 'Number of payment retry attempts';


--
-- Name: COLUMN "user".payment_grace_until; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".payment_grace_until IS 'Grace period end timestamp (7 days from first failure)';


--
-- Name: COLUMN "user".account_suspended_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".account_suspended_at IS 'Timestamp when account was suspended (after grace period)';


--
-- Name: COLUMN "user".is_sole_controller; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".is_sole_controller IS 'True if user is the only director/controller, false if there are others, NULL if not declared';


--
-- Name: COLUMN "user".additional_controllers_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".additional_controllers_count IS 'Number of other directors/controllers (NULL if unknown or if user is sole controller)';


--
-- Name: COLUMN "user".controllers_declared_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".controllers_declared_at IS 'Timestamp when the controllers declaration was made or last updated';


--
-- Name: COLUMN "user".owners_pending_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".owners_pending_info IS 'True when user declared they are NOT sole controller but has not provided owner emails yet';


--
-- Name: COLUMN "user".stripe_customer_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".stripe_customer_id IS 'Stripe customer ID when BILLING_PROVIDER=stripe';


--
-- Name: COLUMN "user".stripe_default_payment_method_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".stripe_default_payment_method_id IS 'Stripe default payment method ID';


--
-- Name: user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_id_seq OWNED BY public."user".id;


--
-- Name: user_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profile (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    state text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_profile_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_profile_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_profile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_profile_id_seq OWNED BY public.user_profile.id;


--
-- Name: user_profile_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.user_profile_view AS
 SELECT id,
    email,
    status AS state,
    first_name,
    last_name,
    kyc_verified_at_ms,
    kyc_rejection_reason,
    email_pref_marketing,
    email_pref_product,
    email_pref_system
   FROM public."user" u;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email text NOT NULL,
    password_hash text,
    role text DEFAULT 'user'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: verification_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification_event (
    id bigint NOT NULL,
    subject_type text NOT NULL,
    subject_id bigint NOT NULL,
    event_type text NOT NULL,
    payload_json jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT verification_event_subject_type_check CHECK ((subject_type = ANY (ARRAY['user'::text, 'business_owner'::text])))
);


--
-- Name: TABLE verification_event; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.verification_event IS 'Audit log for identity verification actions (invite_sent, webhook_received, etc.)';


--
-- Name: verification_event_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.verification_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: verification_event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.verification_event_id_seq OWNED BY public.verification_event.id;


--
-- Name: webhook_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_log (
    id bigint NOT NULL,
    source text,
    event_type text,
    payload_json text,
    created_at bigint NOT NULL,
    provider text NOT NULL,
    status text,
    payload jsonb,
    received_at timestamp with time zone DEFAULT now(),
    received_at_ms bigint,
    external_event_id text,
    error text,
    type text
);


--
-- Name: webhook_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.webhook_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: webhook_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.webhook_log_id_seq OWNED BY public.webhook_log.id;


--
-- Name: activity_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log ALTER COLUMN id SET DEFAULT nextval('public.activity_log_id_seq'::regclass);


--
-- Name: address_slot id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.address_slot ALTER COLUMN id SET DEFAULT nextval('public.address_slot_id_seq'::regclass);


--
-- Name: admin_activity id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_activity ALTER COLUMN id SET DEFAULT nextval('public.admin_activity_id_seq'::regclass);


--
-- Name: admin_audit id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit ALTER COLUMN id SET DEFAULT nextval('public.admin_audit_id_seq'::regclass);


--
-- Name: admin_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_log ALTER COLUMN id SET DEFAULT nextval('public.admin_log_id_seq'::regclass);


--
-- Name: admin_operation_locks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_operation_locks ALTER COLUMN id SET DEFAULT nextval('public.admin_operation_locks_id_seq'::regclass);


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: blog_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_categories ALTER COLUMN id SET DEFAULT nextval('public.blog_categories_id_seq'::regclass);


--
-- Name: blog_posts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts ALTER COLUMN id SET DEFAULT nextval('public.blog_posts_id_seq'::regclass);


--
-- Name: business id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business ALTER COLUMN id SET DEFAULT nextval('public.business_id_seq'::regclass);


--
-- Name: business_owner id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_owner ALTER COLUMN id SET DEFAULT nextval('public.business_owner_id_seq'::regclass);


--
-- Name: business_owner_invite id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_owner_invite ALTER COLUMN id SET DEFAULT nextval('public.business_owner_invite_id_seq'::regclass);


--
-- Name: concurrent_operations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concurrent_operations ALTER COLUMN id SET DEFAULT nextval('public.concurrent_operations_id_seq'::regclass);


--
-- Name: destruction_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.destruction_log ALTER COLUMN id SET DEFAULT nextval('public.destruction_log_id_seq'::regclass);


--
-- Name: download id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.download ALTER COLUMN id SET DEFAULT nextval('public.download_id_seq'::regclass);


--
-- Name: email_change_request id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_change_request ALTER COLUMN id SET DEFAULT nextval('public.email_change_request_id_seq'::regclass);


--
-- Name: email_preferences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_preferences ALTER COLUMN id SET DEFAULT nextval('public.email_preferences_id_seq'::regclass);


--
-- Name: export_job id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_job ALTER COLUMN id SET DEFAULT nextval('public.export_job_id_seq'::regclass);


--
-- Name: file id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file ALTER COLUMN id SET DEFAULT nextval('public.file_id_seq'::regclass);


--
-- Name: forwarding_charge id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forwarding_charge ALTER COLUMN id SET DEFAULT nextval('public.forwarding_charge_id_seq'::regclass);


--
-- Name: forwarding_outbox id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forwarding_outbox ALTER COLUMN id SET DEFAULT nextval('public.forwarding_outbox_id_seq'::regclass);


--
-- Name: forwarding_request id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forwarding_request ALTER COLUMN id SET DEFAULT nextval('public.forwarding_request_id_seq'::regclass);


--
-- Name: gc_billing_request_flow id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gc_billing_request_flow ALTER COLUMN id SET DEFAULT nextval('public.gc_billing_request_flow_id_seq'::regclass);


--
-- Name: gc_redirect_flow id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gc_redirect_flow ALTER COLUMN id SET DEFAULT nextval('public.gc_redirect_flow_id_seq'::regclass);


--
-- Name: invoice id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice ALTER COLUMN id SET DEFAULT nextval('public.invoice_id_seq1'::regclass);


--
-- Name: invoice_seq id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_seq ALTER COLUMN id SET DEFAULT nextval('public.invoice_seq_id_seq1'::regclass);


--
-- Name: invoice_token id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_token ALTER COLUMN id SET DEFAULT nextval('public.invoice_token_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoice_id_seq'::regclass);


--
-- Name: invoices_seq id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices_seq ALTER COLUMN id SET DEFAULT nextval('public.invoice_seq_id_seq'::regclass);


--
-- Name: kyc_status id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_status ALTER COLUMN id SET DEFAULT nextval('public.kyc_status_id_seq'::regclass);


--
-- Name: location id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location ALTER COLUMN id SET DEFAULT nextval('public.location_id_seq'::regclass);


--
-- Name: mail_event id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mail_event ALTER COLUMN id SET DEFAULT nextval('public.mail_event_id_seq'::regclass);


--
-- Name: mail_item id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mail_item ALTER COLUMN id SET DEFAULT nextval('public.mail_item_id_seq'::regclass);


--
-- Name: password_reset id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset ALTER COLUMN id SET DEFAULT nextval('public.password_reset_id_seq'::regclass);


--
-- Name: payment id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment ALTER COLUMN id SET DEFAULT nextval('public.payment_id_seq'::regclass);


--
-- Name: plan_price_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_price_history ALTER COLUMN id SET DEFAULT nextval('public.plan_price_history_id_seq'::regclass);


--
-- Name: plan_status_event id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_status_event ALTER COLUMN id SET DEFAULT nextval('public.plan_status_event_id_seq'::regclass);


--
-- Name: plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans ALTER COLUMN id SET DEFAULT nextval('public.plans_id_seq'::regclass);


--
-- Name: quiz_leads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_leads ALTER COLUMN id SET DEFAULT nextval('public.quiz_leads_id_seq'::regclass);


--
-- Name: scan_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scan_tokens ALTER COLUMN id SET DEFAULT nextval('public.scan_tokens_id_seq'::regclass);


--
-- Name: subscription id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription ALTER COLUMN id SET DEFAULT nextval('public.subscription_id_seq'::regclass);


--
-- Name: support_ticket id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket ALTER COLUMN id SET DEFAULT nextval('public.support_ticket_id_seq'::regclass);


--
-- Name: usage_charges id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_charges ALTER COLUMN id SET DEFAULT nextval('public.usage_charges_id_seq'::regclass);


--
-- Name: user id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user" ALTER COLUMN id SET DEFAULT nextval('public.user_id_seq'::regclass);


--
-- Name: user_profile id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profile ALTER COLUMN id SET DEFAULT nextval('public.user_profile_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: verification_event id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_event ALTER COLUMN id SET DEFAULT nextval('public.verification_event_id_seq'::regclass);


--
-- Name: webhook_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_log ALTER COLUMN id SET DEFAULT nextval('public.webhook_log_id_seq'::regclass);


--
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);


--
-- Name: address_slot address_slot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.address_slot
    ADD CONSTRAINT address_slot_pkey PRIMARY KEY (id);


--
-- Name: admin_activity admin_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_activity
    ADD CONSTRAINT admin_activity_pkey PRIMARY KEY (id);


--
-- Name: admin_audit admin_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit
    ADD CONSTRAINT admin_audit_pkey PRIMARY KEY (id);


--
-- Name: admin_log admin_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_log
    ADD CONSTRAINT admin_log_pkey PRIMARY KEY (id);


--
-- Name: admin_operation_locks admin_operation_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_operation_locks
    ADD CONSTRAINT admin_operation_locks_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: blog_categories blog_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_categories
    ADD CONSTRAINT blog_categories_name_key UNIQUE (name);


--
-- Name: blog_categories blog_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_categories
    ADD CONSTRAINT blog_categories_pkey PRIMARY KEY (id);


--
-- Name: blog_categories blog_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_categories
    ADD CONSTRAINT blog_categories_slug_key UNIQUE (slug);


--
-- Name: blog_posts blog_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_slug_key UNIQUE (slug);


--
-- Name: business_owner_invite business_owner_invite_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_owner_invite
    ADD CONSTRAINT business_owner_invite_pkey PRIMARY KEY (id);


--
-- Name: business_owner business_owner_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_owner
    ADD CONSTRAINT business_owner_pkey PRIMARY KEY (id);


--
-- Name: business business_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business
    ADD CONSTRAINT business_pkey PRIMARY KEY (id);


--
-- Name: charge charge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.charge
    ADD CONSTRAINT charge_pkey PRIMARY KEY (id);


--
-- Name: concurrent_operations concurrent_operations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concurrent_operations
    ADD CONSTRAINT concurrent_operations_pkey PRIMARY KEY (id);


--
-- Name: destruction_log destruction_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.destruction_log
    ADD CONSTRAINT destruction_log_pkey PRIMARY KEY (id);


--
-- Name: download download_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.download
    ADD CONSTRAINT download_pkey PRIMARY KEY (id);


--
-- Name: email_change_request email_change_request_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_change_request
    ADD CONSTRAINT email_change_request_pkey PRIMARY KEY (id);


--
-- Name: email_preferences email_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_preferences
    ADD CONSTRAINT email_preferences_pkey PRIMARY KEY (id);


--
-- Name: export_job export_job_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_job
    ADD CONSTRAINT export_job_pkey PRIMARY KEY (id);


--
-- Name: file file_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file
    ADD CONSTRAINT file_item_id_key UNIQUE (item_id);


--
-- Name: file file_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file
    ADD CONSTRAINT file_pkey PRIMARY KEY (id);


--
-- Name: forwarding_charge forwarding_charge_forwarding_request_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forwarding_charge
    ADD CONSTRAINT forwarding_charge_forwarding_request_id_key UNIQUE (forwarding_request_id);


--
-- Name: forwarding_charge forwarding_charge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forwarding_charge
    ADD CONSTRAINT forwarding_charge_pkey PRIMARY KEY (id);


--
-- Name: forwarding_outbox forwarding_outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forwarding_outbox
    ADD CONSTRAINT forwarding_outbox_pkey PRIMARY KEY (id);


--
-- Name: forwarding_request forwarding_request_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forwarding_request
    ADD CONSTRAINT forwarding_request_pkey PRIMARY KEY (id);


--
-- Name: gc_billing_request_flow gc_billing_request_flow_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gc_billing_request_flow
    ADD CONSTRAINT gc_billing_request_flow_pkey PRIMARY KEY (id);


--
-- Name: gc_redirect_flow gc_redirect_flow_flow_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gc_redirect_flow
    ADD CONSTRAINT gc_redirect_flow_flow_id_key UNIQUE (flow_id);


--
-- Name: gc_redirect_flow gc_redirect_flow_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gc_redirect_flow
    ADD CONSTRAINT gc_redirect_flow_pkey PRIMARY KEY (id);


--
-- Name: invoices invoice_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoice_invoice_number_key UNIQUE (invoice_number);


--
-- Name: invoice invoice_invoice_number_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_invoice_number_key1 UNIQUE (invoice_number);


--
-- Name: invoices invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoice_pkey PRIMARY KEY (id);


--
-- Name: invoice invoice_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_pkey1 PRIMARY KEY (id);


--
-- Name: invoices_seq invoice_seq_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices_seq
    ADD CONSTRAINT invoice_seq_pkey PRIMARY KEY (id);


--
-- Name: invoice_seq invoice_seq_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_seq
    ADD CONSTRAINT invoice_seq_pkey1 PRIMARY KEY (id);


--
-- Name: invoice_token invoice_token_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_token
    ADD CONSTRAINT invoice_token_pkey PRIMARY KEY (id);


--
-- Name: invoice_token invoice_token_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_token
    ADD CONSTRAINT invoice_token_token_key UNIQUE (token);


--
-- Name: kyc_status kyc_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_status
    ADD CONSTRAINT kyc_status_pkey PRIMARY KEY (id);


--
-- Name: location location_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location
    ADD CONSTRAINT location_pkey PRIMARY KEY (id);


--
-- Name: mail_event mail_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mail_event
    ADD CONSTRAINT mail_event_pkey PRIMARY KEY (id);


--
-- Name: mail_item mail_item_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mail_item
    ADD CONSTRAINT mail_item_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: mail_item mail_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mail_item
    ADD CONSTRAINT mail_item_pkey PRIMARY KEY (id);


--
-- Name: password_reset password_reset_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset
    ADD CONSTRAINT password_reset_pkey PRIMARY KEY (id);


--
-- Name: password_reset password_reset_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset
    ADD CONSTRAINT password_reset_token_key UNIQUE (token);


--
-- Name: payment payment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_pkey PRIMARY KEY (id);


--
-- Name: plan_price_history plan_price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_price_history
    ADD CONSTRAINT plan_price_history_pkey PRIMARY KEY (id);


--
-- Name: plan_status_event plan_status_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_status_event
    ADD CONSTRAINT plan_status_event_pkey PRIMARY KEY (id);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: plans plans_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_slug_key UNIQUE (slug);


--
-- Name: quiz_leads quiz_leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_leads
    ADD CONSTRAINT quiz_leads_pkey PRIMARY KEY (id);


--
-- Name: scan_tokens scan_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scan_tokens
    ADD CONSTRAINT scan_tokens_pkey PRIMARY KEY (id);


--
-- Name: scan_tokens scan_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scan_tokens
    ADD CONSTRAINT scan_tokens_token_key UNIQUE (token);


--
-- Name: subscription subscription_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription
    ADD CONSTRAINT subscription_pkey PRIMARY KEY (id);


--
-- Name: subscription subscription_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription
    ADD CONSTRAINT subscription_user_id_unique UNIQUE (user_id);


--
-- Name: subscription subscription_user_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription
    ADD CONSTRAINT subscription_user_unique UNIQUE (user_id);


--
-- Name: CONSTRAINT subscription_user_unique ON subscription; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT subscription_user_unique ON public.subscription IS 'Ensures exactly one subscription row per user. Use UPSERT pattern (INSERT ... ON CONFLICT) for all subscription operations.';


--
-- Name: support_ticket support_ticket_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket
    ADD CONSTRAINT support_ticket_pkey PRIMARY KEY (id);


--
-- Name: destruction_log unique_mail_item_destruction; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.destruction_log
    ADD CONSTRAINT unique_mail_item_destruction UNIQUE (mail_item_id);


--
-- Name: usage_charges usage_charges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_charges
    ADD CONSTRAINT usage_charges_pkey PRIMARY KEY (id);


--
-- Name: user user_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_email_key UNIQUE (email);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: user_profile user_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profile
    ADD CONSTRAINT user_profile_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: verification_event verification_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_event
    ADD CONSTRAINT verification_event_pkey PRIMARY KEY (id);


--
-- Name: webhook_log webhook_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_log
    ADD CONSTRAINT webhook_log_pkey PRIMARY KEY (id);


--
-- Name: address_slot_available_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX address_slot_available_idx ON public.address_slot USING btree (status, location_id, id);


--
-- Name: export_job_created_ms_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX export_job_created_ms_idx ON public.export_job USING btree (created_at_ms);


--
-- Name: export_job_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX export_job_expires_at_idx ON public.export_job USING btree (expires_at);


--
-- Name: export_job_kind_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX export_job_kind_idx ON public.export_job USING btree (kind);


--
-- Name: export_job_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX export_job_status_idx ON public.export_job USING btree (status);


--
-- Name: export_job_status_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX export_job_status_type_idx ON public.export_job USING btree (status, type);


--
-- Name: export_job_storage_expires_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX export_job_storage_expires_idx ON public.export_job USING btree (storage_expires_at);


--
-- Name: export_job_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX export_job_token_idx ON public.export_job USING btree (token);


--
-- Name: export_job_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX export_job_type_idx ON public.export_job USING btree (type);


--
-- Name: export_job_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX export_job_user_id_idx ON public.export_job USING btree (user_id);


--
-- Name: forwarding_request_active_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX forwarding_request_active_uniq ON public.forwarding_request USING btree (user_id, mail_item_id) WHERE (status = ANY (ARRAY['Requested'::text, 'Processing'::text]));


--
-- Name: idx_activity_log_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_log_action ON public.activity_log USING btree (action);


--
-- Name: idx_activity_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_log_created_at ON public.activity_log USING btree (created_at);


--
-- Name: idx_activity_log_mail_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_log_mail_item_id ON public.activity_log USING btree (mail_item_id) WHERE (mail_item_id IS NOT NULL);


--
-- Name: idx_activity_log_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_log_user_id ON public.activity_log USING btree (user_id);


--
-- Name: idx_admin_activity_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_activity_action ON public.admin_activity USING btree (action);


--
-- Name: idx_admin_activity_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_activity_admin ON public.admin_activity USING btree (admin_id);


--
-- Name: idx_admin_activity_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_activity_created ON public.admin_activity USING btree (created_at);


--
-- Name: idx_admin_activity_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_activity_target ON public.admin_activity USING btree (target_type, target_id);


--
-- Name: idx_admin_audit_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_action ON public.admin_audit USING btree (action);


--
-- Name: idx_admin_audit_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_admin_id ON public.admin_audit USING btree (admin_id);


--
-- Name: idx_admin_audit_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_created_at ON public.admin_audit USING btree (created_at);


--
-- Name: idx_admin_audit_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_target ON public.admin_audit USING btree (target_type, target_id);


--
-- Name: idx_admin_log_action_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_log_action_type ON public.admin_log USING btree (action_type);


--
-- Name: idx_admin_log_admin_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_log_admin_user ON public.admin_log USING btree (admin_user_id);


--
-- Name: idx_admin_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_log_created_at ON public.admin_log USING btree (created_at);


--
-- Name: idx_admin_operation_locks_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_operation_locks_admin ON public.admin_operation_locks USING btree (admin_id);


--
-- Name: idx_admin_operation_locks_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_operation_locks_expires ON public.admin_operation_locks USING btree (expires_at);


--
-- Name: idx_admin_operation_locks_operation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_operation_locks_operation ON public.admin_operation_locks USING btree (operation_type);


--
-- Name: idx_audit_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_created_at ON public.audit_log USING btree (created_at);


--
-- Name: idx_audit_log_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_entity ON public.audit_log USING btree (entity, entity_id);


--
-- Name: idx_blog_posts_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_category ON public.blog_posts USING btree (category);


--
-- Name: idx_blog_posts_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_featured ON public.blog_posts USING btree (featured);


--
-- Name: idx_blog_posts_published_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_published_at ON public.blog_posts USING btree (published_at);


--
-- Name: idx_blog_posts_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_slug ON public.blog_posts USING btree (slug);


--
-- Name: idx_blog_posts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_status ON public.blog_posts USING btree (status);


--
-- Name: idx_business_owner_invite_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_business_owner_invite_active ON public.business_owner_invite USING btree (business_owner_id) WHERE (used_at IS NULL);


--
-- Name: idx_business_owner_invite_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_owner_invite_owner_id ON public.business_owner_invite USING btree (business_owner_id);


--
-- Name: idx_business_owner_invite_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_owner_invite_token_hash ON public.business_owner_invite USING btree (token_hash);


--
-- Name: idx_business_owner_kyc_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_owner_kyc_status ON public.business_owner USING btree (status);


--
-- Name: idx_business_owner_user_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_business_owner_user_email ON public.business_owner USING btree (user_id, email);


--
-- Name: idx_business_owner_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_owner_user_id ON public.business_owner USING btree (user_id);


--
-- Name: idx_business_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_user_id ON public.business USING btree (user_id);


--
-- Name: idx_business_user_primary; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_user_primary ON public.business USING btree (user_id, is_primary) WHERE (is_primary = true);


--
-- Name: idx_charge_idempotency; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_charge_idempotency ON public.charge USING btree (type, related_type, related_id) WHERE ((related_type IS NOT NULL) AND (related_id IS NOT NULL));


--
-- Name: idx_charge_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_charge_invoice_id ON public.charge USING btree (invoice_id) WHERE (invoice_id IS NOT NULL);


--
-- Name: idx_charge_related; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_charge_related ON public.charge USING btree (related_type, related_id) WHERE ((related_type IS NOT NULL) AND (related_id IS NOT NULL));


--
-- Name: idx_charge_user_status_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_charge_user_status_date ON public.charge USING btree (user_id, status, service_date);


--
-- Name: idx_concurrent_operations_started; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_concurrent_operations_started ON public.concurrent_operations USING btree (started_at);


--
-- Name: idx_concurrent_operations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_concurrent_operations_status ON public.concurrent_operations USING btree (status);


--
-- Name: idx_concurrent_operations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_concurrent_operations_type ON public.concurrent_operations USING btree (operation_type);


--
-- Name: idx_concurrent_operations_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_concurrent_operations_user ON public.concurrent_operations USING btree (user_id);


--
-- Name: idx_destruction_log_actor_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_destruction_log_actor_type ON public.destruction_log USING btree (actor_type);


--
-- Name: idx_destruction_log_eligibility_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_destruction_log_eligibility_date ON public.destruction_log USING btree (eligibility_date);


--
-- Name: idx_destruction_log_mail_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_destruction_log_mail_item ON public.destruction_log USING btree (mail_item_id);


--
-- Name: idx_destruction_log_recorded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_destruction_log_recorded_at ON public.destruction_log USING btree (recorded_at DESC);


--
-- Name: idx_destruction_log_staff_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_destruction_log_staff_user ON public.destruction_log USING btree (staff_user_id) WHERE (staff_user_id IS NOT NULL);


--
-- Name: idx_destruction_log_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_destruction_log_status ON public.destruction_log USING btree (destruction_status);


--
-- Name: idx_destruction_log_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_destruction_log_user ON public.destruction_log USING btree (user_id);


--
-- Name: idx_download_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_download_created_at ON public.download USING btree (created_at);


--
-- Name: idx_download_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_download_expires_at ON public.download USING btree (expires_at);


--
-- Name: idx_download_file_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_download_file_id ON public.download USING btree (file_id);


--
-- Name: idx_download_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_download_user_id ON public.download USING btree (user_id);


--
-- Name: idx_email_change_request_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_change_request_expires_at ON public.email_change_request USING btree (expires_at);


--
-- Name: idx_email_change_request_last_sent_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_change_request_last_sent_at ON public.email_change_request USING btree (last_sent_at);


--
-- Name: idx_email_change_request_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_change_request_token_hash ON public.email_change_request USING btree (token_hash);


--
-- Name: idx_email_change_request_user_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_email_change_request_user_active ON public.email_change_request USING btree (user_id) WHERE (used_at IS NULL);


--
-- Name: idx_email_change_request_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_change_request_user_id ON public.email_change_request USING btree (user_id);


--
-- Name: idx_email_preferences_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_preferences_user_id ON public.email_preferences USING btree (user_id);


--
-- Name: idx_file_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_file_created_at ON public.file USING btree (created_at);


--
-- Name: idx_file_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_file_deleted ON public.file USING btree (deleted);


--
-- Name: idx_file_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_file_item_id ON public.file USING btree (item_id);


--
-- Name: idx_file_mail_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_file_mail_item_id ON public.file USING btree (mail_item_id);


--
-- Name: idx_file_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_file_user_id ON public.file USING btree (user_id);


--
-- Name: idx_forwarding_charge_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forwarding_charge_request ON public.forwarding_charge USING btree (forwarding_request_id);


--
-- Name: idx_forwarding_charge_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forwarding_charge_status ON public.forwarding_charge USING btree (status);


--
-- Name: idx_forwarding_outbox_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forwarding_outbox_status ON public.forwarding_outbox USING btree (status, next_attempt_at);


--
-- Name: idx_forwarding_req_mail_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forwarding_req_mail_item ON public.forwarding_request USING btree (mail_item_id);


--
-- Name: idx_forwarding_req_processing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forwarding_req_processing ON public.forwarding_request USING btree (processing_at);


--
-- Name: idx_forwarding_req_reviewed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forwarding_req_reviewed ON public.forwarding_request USING btree (reviewed_at);


--
-- Name: idx_forwarding_req_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forwarding_req_status ON public.forwarding_request USING btree (status);


--
-- Name: idx_forwarding_req_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forwarding_req_user ON public.forwarding_request USING btree (user_id);


--
-- Name: idx_forwarding_request_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forwarding_request_created_at ON public.forwarding_request USING btree (created_at);


--
-- Name: idx_forwarding_request_dispatched; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forwarding_request_dispatched ON public.forwarding_request USING btree (dispatched_at);


--
-- Name: idx_forwarding_request_dispatched_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forwarding_request_dispatched_at ON public.forwarding_request USING btree (dispatched_at) WHERE (dispatched_at IS NOT NULL);


--
-- Name: idx_forwarding_request_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forwarding_request_item_id ON public.forwarding_request USING btree (item_id);


--
-- Name: idx_forwarding_request_reviewed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forwarding_request_reviewed ON public.forwarding_request USING btree (reviewed_at);


--
-- Name: idx_forwarding_request_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forwarding_request_status ON public.forwarding_request USING btree (status);


--
-- Name: idx_forwarding_status_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forwarding_status_lower ON public.forwarding_request USING btree (lower(status));


--
-- Name: idx_fr_courier_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fr_courier_trgm ON public.forwarding_request USING gin (courier public.gin_trgm_ops);


--
-- Name: idx_fr_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fr_created_at ON public.forwarding_request USING btree (created_at);


--
-- Name: idx_fr_postal_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fr_postal_trgm ON public.forwarding_request USING gin (postal public.gin_trgm_ops);


--
-- Name: idx_fr_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fr_status ON public.forwarding_request USING btree (status);


--
-- Name: idx_fr_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fr_status_created ON public.forwarding_request USING btree (status, created_at DESC);


--
-- Name: idx_fr_to_name_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fr_to_name_trgm ON public.forwarding_request USING gin (to_name public.gin_trgm_ops);


--
-- Name: idx_fr_tracking_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fr_tracking_trgm ON public.forwarding_request USING gin (tracking_number public.gin_trgm_ops);


--
-- Name: idx_fr_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fr_user_status ON public.forwarding_request USING btree (user_id, status);


--
-- Name: idx_gc_brf_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gc_brf_customer_id ON public.gc_billing_request_flow USING btree (customer_id);


--
-- Name: idx_gc_redirect_flow_plan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gc_redirect_flow_plan_id ON public.gc_redirect_flow USING btree (plan_id);


--
-- Name: idx_gc_redirect_flow_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gc_redirect_flow_user_id ON public.gc_redirect_flow USING btree (user_id);


--
-- Name: idx_invoice_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_created ON public.invoice USING btree (created_at);


--
-- Name: idx_invoice_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_number ON public.invoice USING btree (invoice_number);


--
-- Name: idx_invoice_number_alias; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_number_alias ON public.invoices USING btree (number);


--
-- Name: idx_invoice_seq_year; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_invoice_seq_year ON public.invoice_seq USING btree (year);


--
-- Name: idx_invoice_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_status ON public.invoice USING btree (status);


--
-- Name: idx_invoice_token_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_token_expires ON public.invoice_token USING btree (expires_at);


--
-- Name: idx_invoice_token_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_token_expires_at ON public.invoice_token USING btree (expires_at);


--
-- Name: idx_invoice_token_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_token_invoice ON public.invoice_token USING btree (invoice_id);


--
-- Name: idx_invoice_token_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_token_token ON public.invoice_token USING btree (token);


--
-- Name: idx_invoice_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_user ON public.invoice USING btree (user_id);


--
-- Name: idx_invoices_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_created ON public.invoices USING btree (created_at);


--
-- Name: idx_invoices_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_created_at ON public.invoices USING btree (created_at) WHERE (status = 'paid'::text);


--
-- Name: idx_invoices_email_sent_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_email_sent_at ON public.invoices USING btree (email_sent_at) WHERE (email_sent_at IS NULL);


--
-- Name: idx_invoices_gocardless_payment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_invoices_gocardless_payment_id ON public.invoices USING btree (gocardless_payment_id) WHERE (gocardless_payment_id IS NOT NULL);


--
-- Name: idx_invoices_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_number ON public.invoices USING btree (invoice_number);


--
-- Name: idx_invoices_seq_year; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_invoices_seq_year ON public.invoices_seq USING btree (year);


--
-- Name: idx_invoices_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_status ON public.invoices USING btree (status) WHERE (status = 'paid'::text);


--
-- Name: idx_invoices_stripe_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_invoices_stripe_invoice_id ON public.invoices USING btree (stripe_invoice_id) WHERE (stripe_invoice_id IS NOT NULL);


--
-- Name: idx_invoices_stripe_payment_intent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_stripe_payment_intent ON public.invoices USING btree (stripe_payment_intent_id) WHERE (stripe_payment_intent_id IS NOT NULL);


--
-- Name: idx_invoices_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_user ON public.invoices USING btree (user_id);


--
-- Name: idx_invoices_user_id_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_user_id_period ON public.invoices USING btree (user_id, period_end DESC);


--
-- Name: idx_invoices_user_period_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_invoices_user_period_unique ON public.invoices USING btree (user_id, period_start, period_end);


--
-- Name: INDEX idx_invoices_user_period_unique; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_invoices_user_period_unique IS 'Ensures only one invoice per user per billing period. Used for idempotent invoice generation.';


--
-- Name: idx_kyc_status_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kyc_status_user_id ON public.kyc_status USING btree (user_id);


--
-- Name: idx_mail_event_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mail_event_actor ON public.mail_event USING btree (actor_user);


--
-- Name: idx_mail_event_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mail_event_created_at ON public.mail_event USING btree (created_at);


--
-- Name: idx_mail_event_mail_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mail_event_mail_item ON public.mail_event USING btree (mail_item);


--
-- Name: idx_mail_item_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mail_item_business_id ON public.mail_item USING btree (business_id) WHERE (business_id IS NOT NULL);


--
-- Name: idx_mail_item_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mail_item_created_at ON public.mail_item USING btree (created_at);


--
-- Name: idx_mail_item_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mail_item_deleted ON public.mail_item USING btree (deleted);


--
-- Name: idx_mail_item_destruction_logged; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mail_item_destruction_logged ON public.mail_item USING btree (physical_destruction_date, destruction_logged) WHERE ((physical_destruction_date IS NOT NULL) AND (destruction_logged = false));


--
-- Name: idx_mail_item_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mail_item_expires_at ON public.mail_item USING btree (expires_at);


--
-- Name: idx_mail_item_expiry_notified; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mail_item_expiry_notified ON public.mail_item USING btree (mailroom_expiry_notified_at) WHERE (mailroom_expiry_notified_at IS NULL);


--
-- Name: idx_mail_item_file_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mail_item_file_id ON public.mail_item USING btree (file_id);


--
-- Name: idx_mail_item_file_url; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mail_item_file_url ON public.mail_item USING btree (file_url);


--
-- Name: idx_mail_item_forwarding_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mail_item_forwarding_status ON public.mail_item USING btree (forwarding_status);


--
-- Name: idx_mail_item_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_mail_item_idempotency_key ON public.mail_item USING btree (idempotency_key);


--
-- Name: idx_mail_item_locked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mail_item_locked ON public.mail_item USING btree (locked) WHERE (locked = true);


--
-- Name: idx_mail_item_physical_destruction_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mail_item_physical_destruction_date ON public.mail_item USING btree (physical_destruction_date) WHERE (physical_destruction_date IS NOT NULL);


--
-- Name: idx_mail_item_public_url; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mail_item_public_url ON public.mail_item USING btree (public_url);


--
-- Name: idx_mail_item_received_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mail_item_received_date ON public.mail_item USING btree (received_date);


--
-- Name: idx_mail_item_source_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mail_item_source_slug ON public.mail_item USING btree (source_slug) WHERE (source_slug IS NOT NULL);


--
-- Name: idx_mail_item_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mail_item_status ON public.mail_item USING btree (status);


--
-- Name: idx_mail_item_tag; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mail_item_tag ON public.mail_item USING btree (tag);


--
-- Name: idx_mail_item_updated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mail_item_updated_by ON public.mail_item USING btree (updated_by);


--
-- Name: idx_mail_item_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mail_item_user ON public.mail_item USING btree (user_id);


--
-- Name: idx_mail_item_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mail_item_user_id ON public.mail_item USING btree (user_id);


--
-- Name: idx_mail_item_user_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mail_item_user_read ON public.mail_item USING btree (user_id, is_read);


--
-- Name: idx_mail_item_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mail_item_user_status ON public.mail_item USING btree (user_id, status);


--
-- Name: idx_mail_items_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mail_items_created ON public.mail_item USING btree (created_at);


--
-- Name: idx_mail_items_received; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mail_items_received ON public.mail_item USING btree (received_date);


--
-- Name: idx_mail_items_sender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mail_items_sender ON public.mail_item USING btree (sender_name);


--
-- Name: idx_mail_items_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mail_items_subject ON public.mail_item USING btree (subject);


--
-- Name: idx_password_reset_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_created ON public.password_reset USING btree (created_at);


--
-- Name: idx_password_reset_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_token ON public.password_reset USING btree (token);


--
-- Name: idx_password_reset_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_user ON public.password_reset USING btree (user_id);


--
-- Name: idx_payment_billing_interval; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_billing_interval ON public.payment USING btree (billing_interval);


--
-- Name: idx_payment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_status ON public.payment USING btree (status);


--
-- Name: idx_payment_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_user ON public.payment USING btree (user_id);


--
-- Name: idx_plan_price_history_effective; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_price_history_effective ON public.plan_price_history USING btree (effective_at);


--
-- Name: idx_plan_price_history_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_price_history_plan ON public.plan_price_history USING btree (plan_id);


--
-- Name: idx_plan_status_event_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_status_event_created_at ON public.plan_status_event USING btree (created_at DESC);


--
-- Name: idx_plan_status_event_gocardless_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_status_event_gocardless_event_id ON public.plan_status_event USING btree (gocardless_event_id) WHERE (gocardless_event_id IS NOT NULL);


--
-- Name: idx_plan_status_event_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_status_event_user_id ON public.plan_status_event USING btree (user_id);


--
-- Name: idx_plans_active_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plans_active_sort ON public.plans USING btree (active, sort, price_pence);


--
-- Name: idx_plans_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plans_slug ON public.plans USING btree (slug);


--
-- Name: idx_quiz_leads_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_leads_created_at ON public.quiz_leads USING btree (created_at DESC);


--
-- Name: idx_quiz_leads_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_leads_email ON public.quiz_leads USING btree (email);


--
-- Name: idx_quiz_leads_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_leads_score ON public.quiz_leads USING btree (score);


--
-- Name: idx_quiz_leads_segment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_leads_segment ON public.quiz_leads USING btree (segment);


--
-- Name: idx_scan_tokens_exp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scan_tokens_exp ON public.scan_tokens USING btree (expires_at);


--
-- Name: idx_scan_tokens_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scan_tokens_item ON public.scan_tokens USING btree (mail_item_id);


--
-- Name: idx_scan_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scan_tokens_token ON public.scan_tokens USING btree (token);


--
-- Name: idx_subscription_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_customer_id ON public.subscription USING btree (customer_id);


--
-- Name: idx_subscription_last_event_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_last_event_created_at ON public.subscription USING btree (last_event_created_at) WHERE (last_event_created_at IS NOT NULL);


--
-- Name: idx_subscription_stripe_subscription_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_stripe_subscription_id ON public.subscription USING btree (stripe_subscription_id) WHERE (stripe_subscription_id IS NOT NULL);


--
-- Name: idx_subscription_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_user ON public.subscription USING btree (user_id);


--
-- Name: idx_support_ticket_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_ticket_status ON public.support_ticket USING btree (status);


--
-- Name: idx_support_ticket_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_ticket_user ON public.support_ticket USING btree (user_id);


--
-- Name: idx_usage_user_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_user_month ON public.usage_charges USING btree (user_id, period_yyyymm);


--
-- Name: idx_user_ch_reminder_sent_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_ch_reminder_sent_at ON public."user" USING btree (ch_reminder_last_sent_at);


--
-- Name: idx_user_ch_verification_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_ch_verification_status ON public."user" USING btree (ch_verification_status);


--
-- Name: idx_user_ch_verification_submitted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_ch_verification_submitted_at ON public."user" USING btree (ch_verification_submitted_at);


--
-- Name: idx_user_ch_verified; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_ch_verified ON public."user" USING btree (companies_house_verified);


--
-- Name: idx_user_controllers_declared; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_controllers_declared ON public."user" USING btree (controllers_declared_at) WHERE (controllers_declared_at IS NOT NULL);


--
-- Name: idx_user_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_deleted_at ON public."user" USING btree (deleted_at);


--
-- Name: idx_user_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_email ON public."user" USING btree (email);


--
-- Name: idx_user_email_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_email_active ON public."user" USING btree (email) WHERE (deleted_at IS NULL);


--
-- Name: idx_user_email_unsubscribed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_email_unsubscribed_at ON public."user" USING btree (email_unsubscribed_at);


--
-- Name: idx_user_gocardless_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_gocardless_customer ON public."user" USING btree (gocardless_customer_id);


--
-- Name: idx_user_gocardless_mandate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_gocardless_mandate ON public."user" USING btree (gocardless_mandate_id);


--
-- Name: idx_user_kyc_approved_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_kyc_approved_at ON public."user" USING btree (kyc_approved_at);


--
-- Name: idx_user_kyc_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_kyc_status ON public."user" USING btree (kyc_status) WHERE (deleted_at IS NULL);


--
-- Name: idx_user_kyc_verified_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_kyc_verified_at ON public."user" USING btree (kyc_verified_at);


--
-- Name: idx_user_last_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_last_active ON public."user" USING btree (last_active_at);


--
-- Name: idx_user_last_login; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_last_login ON public."user" USING btree (last_login_at);


--
-- Name: idx_user_last_login_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_last_login_at ON public."user" USING btree (last_login_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_user_owners_pending_info; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_owners_pending_info ON public."user" USING btree (owners_pending_info) WHERE (owners_pending_info = true);


--
-- Name: idx_user_payment_issues; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_payment_issues ON public."user" USING btree (payment_failed_at, payment_retry_count, account_suspended_at);


--
-- Name: idx_user_plan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_plan_id ON public."user" USING btree (plan_id);


--
-- Name: idx_user_plan_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_plan_status ON public."user" USING btree (plan_status);


--
-- Name: idx_user_profile_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profile_user_id ON public.user_profile USING btree (user_id);


--
-- Name: idx_user_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_state ON public."user" USING btree (state);


--
-- Name: idx_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_status ON public."user" USING btree (status);


--
-- Name: idx_user_stripe_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_stripe_customer ON public."user" USING btree (stripe_customer_id) WHERE (stripe_customer_id IS NOT NULL);


--
-- Name: idx_users_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_deleted_at ON public."user" USING btree (deleted_at);


--
-- Name: idx_users_reset_token_lookup_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_users_reset_token_lookup_hash ON public."user" USING btree (reset_token_lookup_hash) WHERE (reset_token_lookup_hash IS NOT NULL);


--
-- Name: idx_verification_event_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verification_event_created_at ON public.verification_event USING btree (created_at);


--
-- Name: idx_verification_event_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verification_event_subject ON public.verification_event USING btree (subject_type, subject_id);


--
-- Name: idx_webhook_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_created ON public.webhook_log USING btree (created_at);


--
-- Name: idx_webhook_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_event_type ON public.webhook_log USING btree (event_type);


--
-- Name: idx_webhook_log_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_log_provider ON public.webhook_log USING btree (provider);


--
-- Name: idx_webhook_log_provider_external_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_webhook_log_provider_external_id ON public.webhook_log USING btree (provider, external_event_id) WHERE ((provider IS NOT NULL) AND (external_event_id IS NOT NULL));


--
-- Name: idx_webhook_log_received_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_log_received_at ON public.webhook_log USING btree (received_at);


--
-- Name: idx_webhook_log_source_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_log_source_created_at ON public.webhook_log USING btree (source, created_at);


--
-- Name: idx_webhook_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_source ON public.webhook_log USING btree (source);


--
-- Name: invoice_token_created_ms_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoice_token_created_ms_idx ON public.invoice_token USING btree (created_at_ms);


--
-- Name: invoice_token_expires_ms_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoice_token_expires_ms_idx ON public.invoice_token USING btree (expires_at_ms);


--
-- Name: mail_item_forwarded_ms_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mail_item_forwarded_ms_idx ON public.mail_item USING btree (forwarded_at_ms);


--
-- Name: mail_item_received_ms_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mail_item_received_ms_idx ON public.mail_item USING btree (received_at_ms);


--
-- Name: plans_effective_at_ms_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plans_effective_at_ms_idx ON public.plans USING btree (effective_at_ms);


--
-- Name: scan_tokens_expires_ms_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX scan_tokens_expires_ms_idx ON public.scan_tokens USING btree (expires_at_ms);


--
-- Name: uniq_users_email_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_users_email_active ON public."user" USING btree (lower(email)) WHERE (deleted_at IS NULL);


--
-- Name: user_active_address_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_active_address_unique ON public.address_slot USING btree (assigned_to) WHERE (status = 'assigned'::text);


--
-- Name: ux_gc_brf_flow_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_gc_brf_flow_id ON public.gc_billing_request_flow USING btree (billing_request_flow_id);


--
-- Name: ux_gc_brf_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_gc_brf_request_id ON public.gc_billing_request_flow USING btree (billing_request_id);


--
-- Name: webhook_log_received_ms_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX webhook_log_received_ms_idx ON public.webhook_log USING btree (received_at_ms);


--
-- Name: forwarding_request forwarding_request_status_mirror; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER forwarding_request_status_mirror AFTER UPDATE OF status ON public.forwarding_request FOR EACH ROW EXECUTE FUNCTION public.trg_forwarding_to_mail_item();


--
-- Name: blog_posts trigger_update_blog_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_blog_posts_updated_at();


--
-- Name: email_preferences update_email_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_email_preferences_updated_at BEFORE UPDATE ON public.email_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: kyc_status update_kyc_status_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_kyc_status_updated_at BEFORE UPDATE ON public.kyc_status FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: mail_item update_mail_item_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_mail_item_updated_at BEFORE UPDATE ON public.mail_item FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_profile update_user_profile_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_profile_updated_at BEFORE UPDATE ON public.user_profile FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user update_user_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON public."user" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activity_log activity_log_mail_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_mail_item_id_fkey FOREIGN KEY (mail_item_id) REFERENCES public.mail_item(id);


--
-- Name: activity_log activity_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id);


--
-- Name: address_slot address_slot_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.address_slot
    ADD CONSTRAINT address_slot_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(id) ON DELETE RESTRICT;


--
-- Name: admin_activity admin_activity_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_activity
    ADD CONSTRAINT admin_activity_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public."user"(id);


--
-- Name: admin_audit admin_audit_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit
    ADD CONSTRAINT admin_audit_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public."user"(id);


--
-- Name: admin_log admin_log_admin_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_log
    ADD CONSTRAINT admin_log_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES public."user"(id);


--
-- Name: admin_operation_locks admin_operation_locks_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_operation_locks
    ADD CONSTRAINT admin_operation_locks_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public."user"(id);


--
-- Name: blog_posts blog_posts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public."user"(id);


--
-- Name: blog_posts blog_posts_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public."user"(id);


--
-- Name: business_owner_invite business_owner_invite_business_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_owner_invite
    ADD CONSTRAINT business_owner_invite_business_owner_id_fkey FOREIGN KEY (business_owner_id) REFERENCES public.business_owner(id) ON DELETE CASCADE;


--
-- Name: business_owner business_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_owner
    ADD CONSTRAINT business_owner_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: business business_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business
    ADD CONSTRAINT business_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: charge charge_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.charge
    ADD CONSTRAINT charge_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;


--
-- Name: charge charge_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.charge
    ADD CONSTRAINT charge_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: concurrent_operations concurrent_operations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concurrent_operations
    ADD CONSTRAINT concurrent_operations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id);


--
-- Name: destruction_log destruction_log_mail_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.destruction_log
    ADD CONSTRAINT destruction_log_mail_item_id_fkey FOREIGN KEY (mail_item_id) REFERENCES public.mail_item(id) ON DELETE CASCADE;


--
-- Name: destruction_log destruction_log_staff_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.destruction_log
    ADD CONSTRAINT destruction_log_staff_user_id_fkey FOREIGN KEY (staff_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: destruction_log destruction_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.destruction_log
    ADD CONSTRAINT destruction_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: download download_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.download
    ADD CONSTRAINT download_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.file(id) ON DELETE SET NULL;


--
-- Name: download download_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.download
    ADD CONSTRAINT download_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: email_change_request email_change_request_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_change_request
    ADD CONSTRAINT email_change_request_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: email_preferences email_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_preferences
    ADD CONSTRAINT email_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: file file_mail_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file
    ADD CONSTRAINT file_mail_item_id_fkey FOREIGN KEY (mail_item_id) REFERENCES public.mail_item(id) ON DELETE SET NULL;


--
-- Name: file file_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file
    ADD CONSTRAINT file_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: forwarding_charge forwarding_charge_forwarding_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forwarding_charge
    ADD CONSTRAINT forwarding_charge_forwarding_request_id_fkey FOREIGN KEY (forwarding_request_id) REFERENCES public.forwarding_request(id) ON DELETE CASCADE;


--
-- Name: forwarding_outbox forwarding_outbox_forwarding_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forwarding_outbox
    ADD CONSTRAINT forwarding_outbox_forwarding_request_id_fkey FOREIGN KEY (forwarding_request_id) REFERENCES public.forwarding_request(id) ON DELETE CASCADE;


--
-- Name: forwarding_request forwarding_request_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forwarding_request
    ADD CONSTRAINT forwarding_request_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.mail_item(id);


--
-- Name: forwarding_request forwarding_request_mail_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forwarding_request
    ADD CONSTRAINT forwarding_request_mail_item_id_fkey FOREIGN KEY (mail_item_id) REFERENCES public.mail_item(id) ON DELETE CASCADE;


--
-- Name: forwarding_request forwarding_request_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forwarding_request
    ADD CONSTRAINT forwarding_request_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: gc_billing_request_flow gc_billing_request_flow_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gc_billing_request_flow
    ADD CONSTRAINT gc_billing_request_flow_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- Name: gc_billing_request_flow gc_billing_request_flow_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gc_billing_request_flow
    ADD CONSTRAINT gc_billing_request_flow_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id);


--
-- Name: gc_redirect_flow gc_redirect_flow_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gc_redirect_flow
    ADD CONSTRAINT gc_redirect_flow_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- Name: gc_redirect_flow gc_redirect_flow_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gc_redirect_flow
    ADD CONSTRAINT gc_redirect_flow_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id);


--
-- Name: invoice_token invoice_token_invoices_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_token
    ADD CONSTRAINT invoice_token_invoices_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: invoices invoice_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoice_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: invoice invoice_user_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_user_id_fkey1 FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: kyc_status kyc_status_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_status
    ADD CONSTRAINT kyc_status_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: mail_event mail_event_actor_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mail_event
    ADD CONSTRAINT mail_event_actor_user_fkey FOREIGN KEY (actor_user) REFERENCES public."user"(id);


--
-- Name: mail_event mail_event_mail_item_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mail_event
    ADD CONSTRAINT mail_event_mail_item_fkey FOREIGN KEY (mail_item) REFERENCES public.mail_item(id) ON DELETE CASCADE;


--
-- Name: mail_item mail_item_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mail_item
    ADD CONSTRAINT mail_item_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business(id) ON DELETE SET NULL;


--
-- Name: mail_item mail_item_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mail_item
    ADD CONSTRAINT mail_item_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.file(id) ON DELETE SET NULL;


--
-- Name: mail_item mail_item_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mail_item
    ADD CONSTRAINT mail_item_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: mail_item mail_item_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mail_item
    ADD CONSTRAINT mail_item_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: password_reset password_reset_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset
    ADD CONSTRAINT password_reset_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: payment payment_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: plan_price_history plan_price_history_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_price_history
    ADD CONSTRAINT plan_price_history_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE;


--
-- Name: plan_status_event plan_status_event_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_status_event
    ADD CONSTRAINT plan_status_event_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscription(id) ON DELETE SET NULL;


--
-- Name: plan_status_event plan_status_event_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_status_event
    ADD CONSTRAINT plan_status_event_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: scan_tokens scan_tokens_issued_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scan_tokens
    ADD CONSTRAINT scan_tokens_issued_to_fkey FOREIGN KEY (issued_to) REFERENCES public."user"(id);


--
-- Name: scan_tokens scan_tokens_mail_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scan_tokens
    ADD CONSTRAINT scan_tokens_mail_item_id_fkey FOREIGN KEY (mail_item_id) REFERENCES public.mail_item(id) ON DELETE CASCADE;


--
-- Name: support_ticket support_ticket_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket
    ADD CONSTRAINT support_ticket_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: user user_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- Name: user_profile user_profile_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profile
    ADD CONSTRAINT user_profile_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 96MRvkbTicY1esVBDH1KiXZfDo1MsSdKsqnQimXQieN2rXvWk9zgOo5dfCwMUv8


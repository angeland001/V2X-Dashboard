--
-- PostgreSQL database dump
--

\restrict 0rhEYI2b7HoutbbSISvjKEUSw9tege0cicVMI8HTgJcXOvURapZ1d2Bu7tyiVVB

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

-- Started on 2026-01-12 11:43:01

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 5933 (class 1262 OID 16426)
-- Name: kepler_db; Type: DATABASE; Schema: -; Owner: postgres
--

CREATE DATABASE kepler_db WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'English_United States.1252';


ALTER DATABASE kepler_db OWNER TO postgres;

\unrestrict 0rhEYI2b7HoutbbSISvjKEUSw9tege0cicVMI8HTgJcXOvURapZ1d2Bu7tyiVVB
\connect kepler_db
\restrict 0rhEYI2b7HoutbbSISvjKEUSw9tege0cicVMI8HTgJcXOvURapZ1d2Bu7tyiVVB

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 7 (class 2615 OID 21044)
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO postgres;

--
-- TOC entry 857 (class 1255 OID 22250)
-- Name: check_point_in_geofences(double precision, double precision); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_point_in_geofences(point_lon double precision, point_lat double precision) RETURNS TABLE(geofence_id integer, geofence_name character varying, geofence_type character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.name,
    g.geofence_type
  FROM geofences g
  WHERE ST_Contains(
    g.geometry,
    ST_SetSRID(ST_MakePoint(point_lon, point_lat), 4326)
  )
  AND g.status = 'active';
END;
$$;


ALTER FUNCTION public.check_point_in_geofences(point_lon double precision, point_lat double precision) OWNER TO postgres;

--
-- TOC entry 350 (class 1255 OID 22251)
-- Name: get_geofences_in_bbox(double precision, double precision, double precision, double precision); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_geofences_in_bbox(min_lon double precision, min_lat double precision, max_lon double precision, max_lat double precision) RETURNS TABLE(id integer, name character varying, geofence_type character varying, geometry_geojson jsonb)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.name,
    g.geofence_type,
    ST_AsGeoJSON(g.geometry)::jsonb
  FROM geofences g
  WHERE ST_Intersects(
    g.geometry,
    ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326)
  )
  AND g.status = 'active';
END;
$$;


ALTER FUNCTION public.get_geofences_in_bbox(min_lon double precision, min_lat double precision, max_lon double precision, max_lat double precision) OWNER TO postgres;

--
-- TOC entry 423 (class 1255 OID 22274)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 233 (class 1259 OID 22196)
-- Name: geofence_alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.geofence_alerts (
    id integer NOT NULL,
    geofence_id integer,
    alert_type character varying(50) NOT NULL,
    severity character varying(20),
    alert_message text NOT NULL,
    trigger_conditions jsonb DEFAULT '{}'::jsonb,
    active boolean DEFAULT true,
    triggered_at timestamp without time zone,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.geofence_alerts OWNER TO postgres;

--
-- TOC entry 5935 (class 0 OID 0)
-- Dependencies: 233
-- Name: TABLE geofence_alerts; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.geofence_alerts IS 'Alert rules and triggers for TIM messages';


--
-- TOC entry 232 (class 1259 OID 22195)
-- Name: geofence_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.geofence_alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.geofence_alerts_id_seq OWNER TO postgres;

--
-- TOC entry 5936 (class 0 OID 0)
-- Dependencies: 232
-- Name: geofence_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.geofence_alerts_id_seq OWNED BY public.geofence_alerts.id;


--
-- TOC entry 231 (class 1259 OID 22173)
-- Name: geofence_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.geofence_events (
    id integer NOT NULL,
    geofence_id integer,
    event_type character varying(50) NOT NULL,
    object_id character varying(100),
    object_type character varying(50),
    event_location public.geometry(Point,4326),
    event_time timestamp without time zone NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.geofence_events OWNER TO postgres;

--
-- TOC entry 5937 (class 0 OID 0)
-- Dependencies: 231
-- Name: TABLE geofence_events; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.geofence_events IS 'Event log for objects entering/exiting geofences (SDSM integration)';


--
-- TOC entry 230 (class 1259 OID 22172)
-- Name: geofence_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.geofence_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.geofence_events_id_seq OWNER TO postgres;

--
-- TOC entry 5938 (class 0 OID 0)
-- Dependencies: 230
-- Name: geofence_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.geofence_events_id_seq OWNED BY public.geofence_events.id;


--
-- TOC entry 229 (class 1259 OID 22151)
-- Name: geofence_intersections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.geofence_intersections (
    id integer NOT NULL,
    geofence_id integer,
    intersection_id character varying(50) NOT NULL,
    approach_lanes jsonb DEFAULT '[]'::jsonb,
    signal_groups jsonb DEFAULT '[]'::jsonb,
    lidar_coverage_area public.geometry(Polygon,4326),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.geofence_intersections OWNER TO postgres;

--
-- TOC entry 5939 (class 0 OID 0)
-- Dependencies: 229
-- Name: TABLE geofence_intersections; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.geofence_intersections IS 'Links geofences to V2X intersection infrastructure';


--
-- TOC entry 228 (class 1259 OID 22150)
-- Name: geofence_intersections_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.geofence_intersections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.geofence_intersections_id_seq OWNER TO postgres;

--
-- TOC entry 5940 (class 0 OID 0)
-- Dependencies: 228
-- Name: geofence_intersections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.geofence_intersections_id_seq OWNED BY public.geofence_intersections.id;


--
-- TOC entry 235 (class 1259 OID 22219)
-- Name: geofence_kepler_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.geofence_kepler_configs (
    id integer NOT NULL,
    geofence_id integer,
    layer_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    filter_config jsonb DEFAULT '{}'::jsonb,
    interaction_config jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.geofence_kepler_configs OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 22218)
-- Name: geofence_kepler_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.geofence_kepler_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.geofence_kepler_configs_id_seq OWNER TO postgres;

--
-- TOC entry 5941 (class 0 OID 0)
-- Dependencies: 234
-- Name: geofence_kepler_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.geofence_kepler_configs_id_seq OWNED BY public.geofence_kepler_configs.id;


--
-- TOC entry 227 (class 1259 OID 22132)
-- Name: geofences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.geofences (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    geometry public.geometry(Polygon,4326) NOT NULL,
    geofence_type character varying(50),
    status character varying(20) DEFAULT 'active'::character varying,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by integer
);


ALTER TABLE public.geofences OWNER TO postgres;

--
-- TOC entry 5942 (class 0 OID 0)
-- Dependencies: 227
-- Name: TABLE geofences; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.geofences IS 'Main table storing geofence polygons for Kepler.gl visualization';


--
-- TOC entry 226 (class 1259 OID 22131)
-- Name: geofences_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.geofences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.geofences_id_seq OWNER TO postgres;

--
-- TOC entry 5943 (class 0 OID 0)
-- Dependencies: 226
-- Name: geofences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.geofences_id_seq OWNED BY public.geofences.id;


--
-- TOC entry 236 (class 1259 OID 22245)
-- Name: geofences_with_active_alerts; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.geofences_with_active_alerts AS
SELECT
    NULL::integer AS id,
    NULL::character varying(255) AS name,
    NULL::character varying(50) AS geofence_type,
    NULL::jsonb AS geometry_geojson,
    NULL::json AS active_alerts;


ALTER VIEW public.geofences_with_active_alerts OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 22291)
-- Name: geofences_with_stats; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.geofences_with_stats AS
SELECT
    NULL::integer AS id,
    NULL::character varying(255) AS name,
    NULL::text AS description,
    NULL::character varying(50) AS geofence_type,
    NULL::character varying(20) AS status,
    NULL::jsonb AS metadata,
    NULL::integer AS created_by,
    NULL::character varying(50) AS created_by_username,
    NULL::character varying(100) AS created_by_first_name,
    NULL::character varying(100) AS created_by_last_name,
    NULL::jsonb AS geometry_geojson,
    NULL::double precision AS area_sq_meters,
    NULL::public.geometry AS centroid,
    NULL::bigint AS total_events,
    NULL::bigint AS unique_objects,
    NULL::timestamp without time zone AS last_event_time,
    NULL::timestamp without time zone AS created_at,
    NULL::timestamp without time zone AS updated_at;


ALTER VIEW public.geofences_with_stats OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 22260)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_login timestamp with time zone,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    date_of_birth date,
    role character varying(50) DEFAULT 'user'::character varying,
    profile_picture character varying(500)
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 22259)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 5944 (class 0 OID 0)
-- Dependencies: 237
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 5717 (class 2604 OID 22199)
-- Name: geofence_alerts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.geofence_alerts ALTER COLUMN id SET DEFAULT nextval('public.geofence_alerts_id_seq'::regclass);


--
-- TOC entry 5714 (class 2604 OID 22176)
-- Name: geofence_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.geofence_events ALTER COLUMN id SET DEFAULT nextval('public.geofence_events_id_seq'::regclass);


--
-- TOC entry 5710 (class 2604 OID 22154)
-- Name: geofence_intersections id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.geofence_intersections ALTER COLUMN id SET DEFAULT nextval('public.geofence_intersections_id_seq'::regclass);


--
-- TOC entry 5721 (class 2604 OID 22222)
-- Name: geofence_kepler_configs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.geofence_kepler_configs ALTER COLUMN id SET DEFAULT nextval('public.geofence_kepler_configs_id_seq'::regclass);


--
-- TOC entry 5705 (class 2604 OID 22135)
-- Name: geofences id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.geofences ALTER COLUMN id SET DEFAULT nextval('public.geofences_id_seq'::regclass);


--
-- TOC entry 5727 (class 2604 OID 22263)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5754 (class 2606 OID 22209)
-- Name: geofence_alerts geofence_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.geofence_alerts
    ADD CONSTRAINT geofence_alerts_pkey PRIMARY KEY (id);


--
-- TOC entry 5748 (class 2606 OID 22185)
-- Name: geofence_events geofence_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.geofence_events
    ADD CONSTRAINT geofence_events_pkey PRIMARY KEY (id);


--
-- TOC entry 5744 (class 2606 OID 22163)
-- Name: geofence_intersections geofence_intersections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.geofence_intersections
    ADD CONSTRAINT geofence_intersections_pkey PRIMARY KEY (id);


--
-- TOC entry 5758 (class 2606 OID 22233)
-- Name: geofence_kepler_configs geofence_kepler_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.geofence_kepler_configs
    ADD CONSTRAINT geofence_kepler_configs_pkey PRIMARY KEY (id);


--
-- TOC entry 5737 (class 2606 OID 22146)
-- Name: geofences geofences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.geofences
    ADD CONSTRAINT geofences_pkey PRIMARY KEY (id);


--
-- TOC entry 5762 (class 2606 OID 22283)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 5764 (class 2606 OID 22270)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5767 (class 2606 OID 22272)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 5751 (class 1259 OID 22216)
-- Name: geofence_alerts_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX geofence_alerts_active_idx ON public.geofence_alerts USING btree (active);


--
-- TOC entry 5752 (class 1259 OID 22215)
-- Name: geofence_alerts_geofence_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX geofence_alerts_geofence_idx ON public.geofence_alerts USING btree (geofence_id);


--
-- TOC entry 5755 (class 1259 OID 22217)
-- Name: geofence_alerts_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX geofence_alerts_type_idx ON public.geofence_alerts USING btree (alert_type);


--
-- TOC entry 5745 (class 1259 OID 22191)
-- Name: geofence_events_geofence_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX geofence_events_geofence_idx ON public.geofence_events USING btree (geofence_id);


--
-- TOC entry 5746 (class 1259 OID 22194)
-- Name: geofence_events_location_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX geofence_events_location_idx ON public.geofence_events USING gist (event_location);


--
-- TOC entry 5749 (class 1259 OID 22192)
-- Name: geofence_events_time_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX geofence_events_time_idx ON public.geofence_events USING btree (event_time);


--
-- TOC entry 5750 (class 1259 OID 22193)
-- Name: geofence_events_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX geofence_events_type_idx ON public.geofence_events USING btree (event_type);


--
-- TOC entry 5740 (class 1259 OID 22169)
-- Name: geofence_intersections_geofence_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX geofence_intersections_geofence_idx ON public.geofence_intersections USING btree (geofence_id);


--
-- TOC entry 5741 (class 1259 OID 22170)
-- Name: geofence_intersections_intersection_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX geofence_intersections_intersection_idx ON public.geofence_intersections USING btree (intersection_id);


--
-- TOC entry 5742 (class 1259 OID 22171)
-- Name: geofence_intersections_lidar_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX geofence_intersections_lidar_idx ON public.geofence_intersections USING gist (lidar_coverage_area);


--
-- TOC entry 5756 (class 1259 OID 22239)
-- Name: geofence_kepler_configs_geofence_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX geofence_kepler_configs_geofence_idx ON public.geofence_kepler_configs USING btree (geofence_id);


--
-- TOC entry 5734 (class 1259 OID 22290)
-- Name: geofences_created_by_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX geofences_created_by_idx ON public.geofences USING btree (created_by);


--
-- TOC entry 5735 (class 1259 OID 22147)
-- Name: geofences_geometry_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX geofences_geometry_idx ON public.geofences USING gist (geometry);


--
-- TOC entry 5738 (class 1259 OID 22149)
-- Name: geofences_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX geofences_status_idx ON public.geofences USING btree (status);


--
-- TOC entry 5739 (class 1259 OID 22148)
-- Name: geofences_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX geofences_type_idx ON public.geofences USING btree (geofence_type);


--
-- TOC entry 5759 (class 1259 OID 22284)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 5760 (class 1259 OID 22273)
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- TOC entry 5765 (class 1259 OID 22296)
-- Name: users_profile_picture_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_profile_picture_idx ON public.users USING btree (id) WHERE (profile_picture IS NOT NULL);


--
-- TOC entry 5926 (class 2618 OID 22248)
-- Name: geofences_with_active_alerts _RETURN; Type: RULE; Schema: public; Owner: postgres
--

CREATE OR REPLACE VIEW public.geofences_with_active_alerts AS
 SELECT g.id,
    g.name,
    g.geofence_type,
    (public.st_asgeojson(g.geometry))::jsonb AS geometry_geojson,
    json_agg(json_build_object('alert_id', ga.id, 'alert_type', ga.alert_type, 'severity', ga.severity, 'message', ga.alert_message, 'triggered_at', ga.triggered_at)) FILTER (WHERE (ga.id IS NOT NULL)) AS active_alerts
   FROM (public.geofences g
     LEFT JOIN public.geofence_alerts ga ON (((g.id = ga.geofence_id) AND (ga.active = true))))
  WHERE ((g.status)::text = 'active'::text)
  GROUP BY g.id;


--
-- TOC entry 5927 (class 2618 OID 22294)
-- Name: geofences_with_stats _RETURN; Type: RULE; Schema: public; Owner: postgres
--

CREATE OR REPLACE VIEW public.geofences_with_stats AS
 SELECT g.id,
    g.name,
    g.description,
    g.geofence_type,
    g.status,
    g.metadata,
    g.created_by,
    u.username AS created_by_username,
    u.first_name AS created_by_first_name,
    u.last_name AS created_by_last_name,
    (public.st_asgeojson(g.geometry))::jsonb AS geometry_geojson,
    public.st_area((g.geometry)::public.geography) AS area_sq_meters,
    public.st_centroid(g.geometry) AS centroid,
    count(DISTINCT ge.id) AS total_events,
    count(DISTINCT ge.object_id) AS unique_objects,
    max(ge.event_time) AS last_event_time,
    g.created_at,
    g.updated_at
   FROM ((public.geofences g
     LEFT JOIN public.geofence_events ge ON ((g.id = ge.geofence_id)))
     LEFT JOIN public.users u ON ((g.created_by = u.id)))
  GROUP BY g.id, u.username, u.first_name, u.last_name;


--
-- TOC entry 5773 (class 2620 OID 22275)
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 5771 (class 2606 OID 22210)
-- Name: geofence_alerts geofence_alerts_geofence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.geofence_alerts
    ADD CONSTRAINT geofence_alerts_geofence_id_fkey FOREIGN KEY (geofence_id) REFERENCES public.geofences(id) ON DELETE CASCADE;


--
-- TOC entry 5770 (class 2606 OID 22186)
-- Name: geofence_events geofence_events_geofence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.geofence_events
    ADD CONSTRAINT geofence_events_geofence_id_fkey FOREIGN KEY (geofence_id) REFERENCES public.geofences(id) ON DELETE CASCADE;


--
-- TOC entry 5769 (class 2606 OID 22164)
-- Name: geofence_intersections geofence_intersections_geofence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.geofence_intersections
    ADD CONSTRAINT geofence_intersections_geofence_id_fkey FOREIGN KEY (geofence_id) REFERENCES public.geofences(id) ON DELETE CASCADE;


--
-- TOC entry 5772 (class 2606 OID 22234)
-- Name: geofence_kepler_configs geofence_kepler_configs_geofence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.geofence_kepler_configs
    ADD CONSTRAINT geofence_kepler_configs_geofence_id_fkey FOREIGN KEY (geofence_id) REFERENCES public.geofences(id) ON DELETE CASCADE;


--
-- TOC entry 5768 (class 2606 OID 22285)
-- Name: geofences geofences_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.geofences
    ADD CONSTRAINT geofences_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5934 (class 0 OID 0)
-- Dependencies: 7
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


-- Completed on 2026-01-12 11:43:01

--
-- PostgreSQL database dump complete
--

\unrestrict 0rhEYI2b7HoutbbSISvjKEUSw9tege0cicVMI8HTgJcXOvURapZ1d2Bu7tyiVVB


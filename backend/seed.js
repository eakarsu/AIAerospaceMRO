const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DB_NAME = process.env.DB_NAME || 'aerospace_mro';

async function seed() {
  // ── Step 1: Drop / Create database ──────────────────────────────────
  const adminPool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: 'postgres',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('Connecting to postgres database...');
    const adminClient = await adminPool.connect();

    // Terminate existing connections to the target DB
    await adminClient.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${DB_NAME}'
        AND pid <> pg_backend_pid();
    `);

    console.log(`Dropping database "${DB_NAME}" if it exists...`);
    await adminClient.query(`DROP DATABASE IF EXISTS ${DB_NAME}`);

    console.log(`Creating database "${DB_NAME}"...`);
    await adminClient.query(`CREATE DATABASE ${DB_NAME}`);

    adminClient.release();
    await adminPool.end();
    console.log('Database created successfully.\n');
  } catch (err) {
    console.error('Error creating database:', err.message);
    await adminPool.end();
    process.exit(1);
  }

  // ── Step 2: Connect to the new database ─────────────────────────────
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log(`Connected to "${DB_NAME}". Creating tables...\n`);

    // ── Drop tables in reverse-dependency order ─────────────────────
    await pool.query(`
      DROP TABLE IF EXISTS warranty_tracking CASCADE;
      DROP TABLE IF EXISTS customers CASCADE;
      DROP TABLE IF EXISTS training_records CASCADE;
      DROP TABLE IF EXISTS hangar_management CASCADE;
      DROP TABLE IF EXISTS shift_scheduling CASCADE;
      DROP TABLE IF EXISTS audit_log CASCADE;
      DROP TABLE IF EXISTS purchase_orders CASCADE;
      DROP TABLE IF EXISTS documents CASCADE;
      DROP TABLE IF EXISTS mel_items CASCADE;
      DROP TABLE IF EXISTS tool_calibration CASCADE;
      DROP TABLE IF EXISTS vendors CASCADE;
      DROP TABLE IF EXISTS fleet_health CASCADE;
      DROP TABLE IF EXISTS technicians CASCADE;
      DROP TABLE IF EXISTS safety_incidents CASCADE;
      DROP TABLE IF EXISTS inventory CASCADE;
      DROP TABLE IF EXISTS work_orders CASCADE;
      DROP TABLE IF EXISTS compliance_records CASCADE;
      DROP TABLE IF EXISTS part_lifecycle CASCADE;
      DROP TABLE IF EXISTS aircraft_maintenance CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);
    console.log('Existing tables dropped.');

    // ── Create tables ───────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'technician',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created table: users');

    await pool.query(`
      CREATE TABLE aircraft_maintenance (
        id SERIAL PRIMARY KEY,
        aircraft_reg VARCHAR(20),
        aircraft_type VARCHAR(100),
        maintenance_type VARCHAR(100),
        scheduled_date DATE,
        due_date DATE,
        status VARCHAR(50) DEFAULT 'Scheduled',
        priority VARCHAR(20) DEFAULT 'Medium',
        assigned_team VARCHAR(100),
        estimated_hours DECIMAL(10,2),
        description TEXT,
        hangar_location VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created table: aircraft_maintenance');

    await pool.query(`
      CREATE TABLE part_lifecycle (
        id SERIAL PRIMARY KEY,
        part_number VARCHAR(50),
        part_name VARCHAR(200),
        serial_number VARCHAR(100),
        aircraft_reg VARCHAR(20),
        installed_date DATE,
        last_inspection DATE,
        next_inspection DATE,
        cycle_count INTEGER DEFAULT 0,
        max_cycles INTEGER,
        flight_hours DECIMAL(10,2) DEFAULT 0,
        max_flight_hours DECIMAL(10,2),
        condition_status VARCHAR(50) DEFAULT 'Serviceable',
        manufacturer VARCHAR(100),
        certificate_number VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created table: part_lifecycle');

    await pool.query(`
      CREATE TABLE compliance_records (
        id SERIAL PRIMARY KEY,
        directive_number VARCHAR(50),
        title VARCHAR(300),
        authority VARCHAR(50) DEFAULT 'FAA',
        aircraft_type VARCHAR(100),
        applicability TEXT,
        compliance_date DATE,
        due_date DATE,
        status VARCHAR(50) DEFAULT 'Open',
        priority VARCHAR(20) DEFAULT 'High',
        description TEXT,
        corrective_action TEXT,
        inspector_name VARCHAR(100),
        documentation_ref VARCHAR(200),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created table: compliance_records');

    await pool.query(`
      CREATE TABLE work_orders (
        id SERIAL PRIMARY KEY,
        wo_number VARCHAR(50) UNIQUE,
        title VARCHAR(300),
        aircraft_reg VARCHAR(20),
        maintenance_type VARCHAR(100),
        priority VARCHAR(20) DEFAULT 'Medium',
        status VARCHAR(50) DEFAULT 'Open',
        assigned_to VARCHAR(100),
        estimated_hours DECIMAL(10,2),
        actual_hours DECIMAL(10,2),
        labor_cost DECIMAL(12,2),
        parts_cost DECIMAL(12,2),
        description TEXT,
        notes TEXT,
        start_date DATE,
        target_completion DATE,
        completed_date DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created table: work_orders');

    await pool.query(`
      CREATE TABLE inventory (
        id SERIAL PRIMARY KEY,
        part_number VARCHAR(50),
        part_name VARCHAR(200),
        category VARCHAR(100),
        quantity INTEGER DEFAULT 0,
        min_quantity INTEGER DEFAULT 5,
        unit_cost DECIMAL(12,2),
        location VARCHAR(100),
        warehouse VARCHAR(50),
        supplier VARCHAR(200),
        condition_code VARCHAR(20) DEFAULT 'NEW',
        certification VARCHAR(100),
        last_received DATE,
        expiry_date DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created table: inventory');

    await pool.query(`
      CREATE TABLE safety_incidents (
        id SERIAL PRIMARY KEY,
        incident_number VARCHAR(50) UNIQUE,
        title VARCHAR(300),
        incident_date DATE,
        aircraft_reg VARCHAR(20),
        location VARCHAR(100),
        severity VARCHAR(20) DEFAULT 'Minor',
        category VARCHAR(100),
        reported_by VARCHAR(100),
        description TEXT,
        root_cause TEXT,
        corrective_action TEXT,
        status VARCHAR(50) DEFAULT 'Open',
        investigation_lead VARCHAR(100),
        closure_date DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created table: safety_incidents');

    await pool.query(`
      CREATE TABLE technicians (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(20) UNIQUE,
        name VARCHAR(100),
        email VARCHAR(255),
        phone VARCHAR(20),
        specialization VARCHAR(100),
        license_type VARCHAR(50),
        license_number VARCHAR(50),
        license_expiry DATE,
        certifications TEXT[],
        rating VARCHAR(20) DEFAULT 'A',
        status VARCHAR(20) DEFAULT 'Active',
        hire_date DATE,
        total_experience_years INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created table: technicians');

    await pool.query(`
      CREATE TABLE fleet_health (
        id SERIAL PRIMARY KEY,
        aircraft_reg VARCHAR(20),
        aircraft_type VARCHAR(100),
        operator VARCHAR(100),
        total_flight_hours DECIMAL(12,2),
        total_cycles INTEGER,
        last_major_check VARCHAR(20),
        last_check_date DATE,
        next_check_due DATE,
        health_score INTEGER DEFAULT 100,
        engine_status VARCHAR(50) DEFAULT 'Normal',
        avionics_status VARCHAR(50) DEFAULT 'Normal',
        airframe_status VARCHAR(50) DEFAULT 'Normal',
        landing_gear_status VARCHAR(50) DEFAULT 'Normal',
        apu_status VARCHAR(50) DEFAULT 'Normal',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created table: fleet_health');

    await pool.query(`
      CREATE TABLE vendors (
        id SERIAL PRIMARY KEY,
        vendor_code VARCHAR(20) UNIQUE,
        company_name VARCHAR(200),
        contact_name VARCHAR(100),
        email VARCHAR(255),
        phone VARCHAR(20),
        address TEXT,
        city VARCHAR(100),
        country VARCHAR(100),
        specialization VARCHAR(200),
        rating DECIMAL(3,2) DEFAULT 5.00,
        contract_start DATE,
        contract_end DATE,
        payment_terms VARCHAR(50),
        status VARCHAR(20) DEFAULT 'Active',
        total_orders INTEGER DEFAULT 0,
        total_spent DECIMAL(14,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created table: vendors');

    await pool.query(`
      CREATE TABLE shift_scheduling (
        id SERIAL PRIMARY KEY,
        shift_code VARCHAR(20),
        technician_name VARCHAR(100),
        employee_id VARCHAR(20),
        shift_type VARCHAR(20) DEFAULT 'Day',
        shift_date DATE,
        start_time TIME,
        end_time TIME,
        hangar_location VARCHAR(50),
        aircraft_reg VARCHAR(20),
        task_description TEXT,
        status VARCHAR(20) DEFAULT 'Scheduled',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created table: shift_scheduling');

    await pool.query(`
      CREATE TABLE hangar_management (
        id SERIAL PRIMARY KEY,
        hangar_code VARCHAR(20),
        hangar_name VARCHAR(100),
        location VARCHAR(100),
        capacity INTEGER DEFAULT 0,
        current_occupancy INTEGER DEFAULT 0,
        aircraft_reg VARCHAR(20),
        hangar_type VARCHAR(50) DEFAULT 'General',
        status VARCHAR(20) DEFAULT 'Available',
        equipment_available TEXT,
        contact_person VARCHAR(100),
        phone VARCHAR(20),
        daily_rate DECIMAL(12,2) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created table: hangar_management');

    await pool.query(`
      CREATE TABLE training_records (
        id SERIAL PRIMARY KEY,
        record_number VARCHAR(20),
        employee_id VARCHAR(20),
        technician_name VARCHAR(100),
        training_type VARCHAR(50) DEFAULT 'Initial',
        course_name VARCHAR(200),
        provider VARCHAR(100),
        start_date DATE,
        completion_date DATE,
        expiry_date DATE,
        score DECIMAL(5,2),
        pass_fail VARCHAR(10) DEFAULT 'Pending',
        certificate_number VARCHAR(50),
        status VARCHAR(20) DEFAULT 'Scheduled',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created table: training_records');

    await pool.query(`
      CREATE TABLE customers (
        id SERIAL PRIMARY KEY,
        customer_code VARCHAR(20),
        company_name VARCHAR(200),
        contact_name VARCHAR(100),
        email VARCHAR(255),
        phone VARCHAR(20),
        address TEXT,
        city VARCHAR(100),
        country VARCHAR(100),
        customer_type VARCHAR(50) DEFAULT 'Airline',
        fleet_size INTEGER DEFAULT 0,
        contract_start DATE,
        contract_end DATE,
        account_manager VARCHAR(100),
        credit_limit DECIMAL(14,2) DEFAULT 0,
        total_revenue DECIMAL(14,2) DEFAULT 0,
        total_work_orders INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'Active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created table: customers');

    await pool.query(`
      CREATE TABLE warranty_tracking (
        id SERIAL PRIMARY KEY,
        warranty_number VARCHAR(20),
        part_number VARCHAR(50),
        part_name VARCHAR(200),
        serial_number VARCHAR(100),
        vendor_name VARCHAR(200),
        purchase_date DATE,
        warranty_start DATE,
        expiry_date DATE,
        warranty_type VARCHAR(50) DEFAULT 'Full',
        coverage_details TEXT,
        claim_status VARCHAR(20) DEFAULT 'No Claim',
        claim_amount DECIMAL(12,2) DEFAULT 0,
        claim_date DATE,
        claim_description TEXT,
        status VARCHAR(20) DEFAULT 'Active',
        aircraft_reg VARCHAR(20),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created table: warranty_tracking');

    console.log('\nAll tables created. Seeding data...\n');

    // ── Seed Users (3) ──────────────────────────────────────────────
    const hashedPassword = await bcrypt.hash('password123', 10);
    await pool.query(`
      INSERT INTO users (name, email, password, role) VALUES
        ('Admin User', 'admin@aeromro.com', $1, 'admin'),
        ('Operations Manager', 'manager@aeromro.com', $1, 'manager'),
        ('Lead Technician', 'tech@aeromro.com', $1, 'technician');
    `, [hashedPassword]);
    console.log('Seeded: users (3 records)');

    // ── Seed Aircraft Maintenance (15) ──────────────────────────────
    await pool.query(`
      INSERT INTO aircraft_maintenance (aircraft_reg, aircraft_type, maintenance_type, scheduled_date, due_date, status, priority, assigned_team, estimated_hours, description, hangar_location) VALUES
        ('N78501', 'Boeing 737-800', 'A-Check', '2026-03-20', '2026-03-25', 'Scheduled', 'High', 'Team Alpha', 48.00, 'Routine A-Check inspection including general visual inspection, lubrication, and operational checks.', 'Hangar A-1'),
        ('N44215', 'Airbus A320neo', 'C-Check', '2026-02-15', '2026-03-15', 'In Progress', 'Critical', 'Team Bravo', 2200.00, 'Heavy maintenance C-Check with structural inspections, system functional tests, and corrosion prevention.', 'Hangar B-2'),
        ('N90832', 'Boeing 787-9', 'Engine Overhaul', '2026-04-01', '2026-04-20', 'Scheduled', 'High', 'Engine Shop', 320.00, 'GEnx-1B engine overhaul including hot section inspection, compressor blade replacement.', 'Engine Bay 1'),
        ('N33190', 'Airbus A350-900', 'D-Check', '2026-01-10', '2026-03-10', 'In Progress', 'Critical', 'Team Charlie', 5500.00, 'Full structural overhaul D-Check with complete paint strip, NDT inspections, and rewiring.', 'Hangar C-1'),
        ('N55678', 'Boeing 777-300ER', 'Landing Gear Inspection', '2026-03-18', '2026-03-22', 'Scheduled', 'Medium', 'Landing Gear Team', 72.00, 'Main and nose landing gear detailed inspection and brake assembly service.', 'Bay 3'),
        ('N12045', 'Embraer E175', 'B-Check', '2026-02-28', '2026-03-05', 'Completed', 'Medium', 'Team Delta', 160.00, 'Intermediate B-Check with filter replacements, detailed inspections, and system tests.', 'Hangar A-3'),
        ('N67892', 'Boeing 737 MAX 8', 'Avionics Update', '2026-03-25', '2026-03-28', 'Scheduled', 'High', 'Avionics Team', 36.00, 'MCAS software update and flight control computer firmware upgrade per AD-2025-15-12.', 'Avionics Bay 2'),
        ('N81234', 'Airbus A330-300', 'Corrosion Treatment', '2026-03-10', '2026-03-14', 'Completed', 'Medium', 'Structures Team', 96.00, 'Wing-to-body fairing corrosion treatment and resealing per SB A330-57-3042.', 'Hangar B-1'),
        ('N22098', 'Boeing 767-300F', 'A-Check', '2026-04-05', '2026-04-08', 'Scheduled', 'Low', 'Team Alpha', 52.00, 'Routine A-Check with cargo door system inspection and hydraulic filter replacements.', 'Hangar A-2'),
        ('N95411', 'Bombardier CRJ-900', 'Engine Borescope', '2026-03-15', '2026-03-16', 'In Progress', 'High', 'Engine Shop', 8.00, 'CF34-8C5 engine borescope inspection following oil consumption trend exceedance.', 'Engine Bay 2'),
        ('N40567', 'Airbus A321XLR', 'Structural Repair', '2026-03-12', '2026-03-18', 'In Progress', 'High', 'Structures Team', 120.00, 'Fuselage skin repair at Station 470 following lightning strike damage assessment.', 'Hangar C-2'),
        ('N73001', 'Boeing 747-8F', 'D-Check', '2025-12-01', '2026-02-28', 'Completed', 'Critical', 'Team Echo', 6200.00, 'Complete D-Check overhaul including upper deck cargo conversion modification.', 'Hangar D-1'),
        ('N88345', 'Embraer E195-E2', 'Wheel and Brake', '2026-03-22', '2026-03-23', 'Scheduled', 'Low', 'Landing Gear Team', 12.00, 'Main wheel assembly replacement and carbon brake wear measurement.', 'Bay 5'),
        ('N61290', 'Boeing 757-200', 'APU Replacement', '2026-03-08', '2026-03-12', 'Deferred', 'Medium', 'Powerplant Team', 40.00, 'GTCP331-200 APU removal and replacement following EGT exceedance event.', 'Hangar A-1'),
        ('N37854', 'Airbus A220-300', 'C-Check', '2026-05-01', '2026-06-01', 'Scheduled', 'High', 'Team Foxtrot', 1800.00, 'First C-Check interval including PW1500G engine trend monitoring review and flight control rigging.', 'Hangar B-3');
    `);
    console.log('Seeded: aircraft_maintenance (15 records)');

    // ── Seed Part Lifecycle (15) ────────────────────────────────────
    await pool.query(`
      INSERT INTO part_lifecycle (part_number, part_name, serial_number, aircraft_reg, installed_date, last_inspection, next_inspection, cycle_count, max_cycles, flight_hours, max_flight_hours, condition_status, manufacturer, certificate_number) VALUES
        ('CFM56-7B26', 'Turbofan Engine Assembly', 'ESN-872451', 'N78501', '2022-06-15', '2025-12-10', '2026-06-10', 12500, 30000, 18750.50, 40000.00, 'Serviceable', 'CFM International', 'EASA.E.072'),
        ('PW4062-3', 'Turbofan Engine Assembly', 'ESN-441098', 'N55678', '2020-03-20', '2025-09-15', '2026-03-15', 18200, 30000, 27300.00, 40000.00, 'Serviceable', 'Pratt & Whitney', 'FAA-E-34A'),
        ('65C-31702-61', 'Flight Control Computer', 'FCC-90234', 'N44215', '2023-01-10', '2025-11-20', '2026-05-20', 8500, 40000, 12750.00, 60000.00, 'Serviceable', 'Honeywell Aerospace', 'TSO-C153a'),
        ('APS3200-1', 'Auxiliary Power Unit', 'APU-56712', 'N61290', '2019-08-22', '2025-06-30', '2026-06-30', 22000, 28000, 9500.00, 12000.00, 'Unserviceable', 'Honeywell Aerospace', 'EASA.P.016'),
        ('270A1500-5', 'Main Landing Gear Actuator', 'LGA-34891', 'N90832', '2021-11-05', '2025-10-15', '2026-04-15', 6800, 20000, 10200.00, 30000.00, 'Serviceable', 'Safran Landing Systems', 'EASA.21J.048'),
        ('332A1100-3', 'Hydraulic Pump Assembly', 'HYD-77543', 'N33190', '2022-09-18', '2025-08-25', '2026-02-25', 9400, 25000, 14100.00, 37500.00, 'Overhauled', 'Parker Aerospace', 'FAA-PMA-12891'),
        ('4071842-901', 'Weather Radar Antenna', 'WRA-12098', 'N67892', '2024-02-28', '2025-12-01', '2026-06-01', 3200, 30000, 4800.00, 45000.00, 'Serviceable', 'Collins Aerospace', 'TSO-C63e'),
        ('GEnx-1B76', 'Turbofan Engine Assembly', 'ESN-954102', 'N90832', '2021-04-12', '2025-10-20', '2026-04-20', 10100, 25000, 15150.00, 35000.00, 'Serviceable', 'GE Aviation', 'FAA-E-47'),
        ('A350-57-4120', 'Wing Spar Cap Assembly', 'WSC-88431', 'N33190', '2018-05-30', '2025-05-30', '2026-05-30', 15600, 50000, 23400.00, 75000.00, 'Serviceable', 'Airbus', 'EASA.21J.070'),
        ('5930-01-234', 'Generator Control Unit', 'GCU-45621', 'N81234', '2023-07-14', '2025-07-14', '2026-01-14', 5100, 20000, 7650.00, 30000.00, 'Serviceable', 'GE Aviation Systems', 'TSO-C77b'),
        ('155W0100-04', 'Tire Main Wheel Assembly', 'TMA-33290', 'N88345', '2025-09-01', '2025-12-15', '2026-03-15', 450, 500, 675.00, 750.00, 'Serviceable', 'Michelin Aircraft Tire', 'TSO-C62e'),
        ('CF34-8C5B1', 'Turbofan Engine Assembly', 'ESN-190832', 'N95411', '2020-10-08', '2025-10-08', '2026-04-08', 16300, 30000, 24450.00, 40000.00, 'Unserviceable', 'GE Aviation', 'FAA-E-39'),
        ('1141AN10-5', 'Oxygen Regulator Panel', 'OXY-67854', 'N12045', '2024-06-20', '2025-06-20', '2026-06-20', 2800, 15000, 4200.00, 22500.00, 'Serviceable', 'B/E Aerospace', 'TSO-C89b'),
        ('501-1345-06', 'Inertial Reference Unit', 'IRU-92017', 'N73001', '2021-12-03', '2025-12-03', '2026-06-03', 11200, 40000, 16800.00, 60000.00, 'Serviceable', 'Northrop Grumman', 'TSO-C4c'),
        ('2456-001-1', 'Fuel Quantity Processor', 'FQP-10983', 'N37854', '2024-09-15', '2025-09-15', '2026-03-15', 1900, 30000, 2850.00, 45000.00, 'Beyond Repair', 'Safran Electronics', 'TSO-C106');
    `);
    console.log('Seeded: part_lifecycle (15 records)');

    // ── Seed Compliance Records (15) ────────────────────────────────
    await pool.query(`
      INSERT INTO compliance_records (directive_number, title, authority, aircraft_type, applicability, compliance_date, due_date, status, priority, description, corrective_action, inspector_name, documentation_ref) VALUES
        ('AD-2024-01-05', 'Engine Fan Blade Inspection for CFM56 Series', 'FAA', 'Boeing 737-800', 'All CFM56-7B engines with more than 10,000 cycles since new', '2025-11-15', '2026-05-15', 'Completed', 'Critical', 'Mandatory repetitive inspection of fan blades for cracking using fluorescent penetrant inspection (FPI).', 'Completed FPI on both engines; no cracks found. Next inspection in 3000 cycles.', 'James Mitchell', 'FAA-AD-2024-01-05-R1'),
        ('AD-2024-03-12', 'A320neo Fuel Tank Wiring Inspection', 'EASA', 'Airbus A320neo', 'All A320neo aircraft with PW1100G-JM engines', NULL, '2026-04-30', 'Open', 'High', 'One-time inspection of fuel tank wiring bundles for chafing damage in wing root area.', NULL, NULL, 'EASA-AD-2024-0087'),
        ('AD-2024-05-08', 'Boeing 787 Horizontal Stabilizer Bolt Inspection', 'FAA', 'Boeing 787-9', 'All 787-8 and 787-9 aircraft', '2026-01-20', '2026-01-30', 'Completed', 'Critical', 'Inspection of horizontal stabilizer attachment bolts for correct torque and corrosion.', 'All bolts inspected and re-torqued per SB 787-55-0024. No corrosion found.', 'Sarah Chen', 'FAA-AD-2024-05-08'),
        ('AD-2024-07-15', 'A350 Wing Rib Foot Fatigue Crack Inspection', 'EASA', 'Airbus A350-900', 'A350-900 aircraft with more than 8000 flight cycles', NULL, '2026-06-15', 'Open', 'High', 'Repetitive detailed visual inspection of wing rib feet at stations WS-210 through WS-350.', NULL, NULL, 'EASA-AD-2024-0152'),
        ('AD-2024-02-20', 'Boeing 777 Cargo Door Latch Inspection', 'FAA', 'Boeing 777-300ER', 'All 777-200/300 series aircraft', '2026-02-10', '2026-02-28', 'Completed', 'High', 'Inspection of lower cargo door latching mechanism for wear and proper engagement.', 'Forward and aft cargo door latches inspected; wear within limits. Lubricated per AMM.', 'Robert Garcia', 'FAA-AD-2024-02-20'),
        ('AD-2025-09-03', 'CRJ-900 Elevator Control Rod Inspection', 'Transport Canada', 'Bombardier CRJ-900', 'All CRJ-900 aircraft with S/N 15001 through 15350', NULL, '2026-03-30', 'In Progress', 'Critical', 'Detailed inspection of elevator control rod end bearings for excessive play and corrosion.', 'Inspection in progress; awaiting rod end bearing replacement parts for left elevator.', 'Michael Torres', 'TC-AD-CF-2025-09'),
        ('AD-2024-11-22', 'E175 Nose Landing Gear Shimmy Damper', 'FAA', 'Embraer E175', 'E175 aircraft with NLG S/N range 4500-5200', '2025-10-05', '2025-12-31', 'Completed', 'Medium', 'Replacement of nose landing gear shimmy damper with improved design per SB 170-32-0054.', 'Shimmy damper replaced with P/N 170-62101-405 (new design). Functional test satisfactory.', 'Linda Park', 'FAA-AD-2024-11-22'),
        ('AD-2025-01-18', '737 MAX MCAS Flight Control Computer Update', 'FAA', 'Boeing 737 MAX 8', 'All 737-8 and 737-9 aircraft', NULL, '2026-03-31', 'In Progress', 'Critical', 'Mandatory software update to flight control computers incorporating revised MCAS logic v4.2.', 'Software load scheduled for 2026-03-25 during planned avionics bay access.', 'James Mitchell', 'FAA-AD-2025-01-18'),
        ('AD-2024-08-30', 'A330 Ram Air Turbine Deployment Test', 'EASA', 'Airbus A330-300', 'All A330 aircraft', '2025-08-20', '2025-09-30', 'Completed', 'Medium', 'Functional test of RAM air turbine deployment and hydraulic output verification.', 'RAT deployment test satisfactory; hydraulic output 3000 PSI nominal.', 'Sarah Chen', 'EASA-AD-2024-0201'),
        ('AD-2025-04-10', 'Boeing 767 Fuselage Lap Joint Inspection', 'FAA', 'Boeing 767-300F', 'B767-300 aircraft with more than 50,000 flight cycles', NULL, '2026-07-10', 'Open', 'High', 'Repetitive eddy current inspection of fuselage lap joints at Stations 540 through 727.', NULL, NULL, 'FAA-AD-2025-04-10'),
        ('AD-2024-06-14', 'Boeing 747-8 Engine Pylon Drain Mast', 'FAA', 'Boeing 747-8F', 'All 747-8 aircraft with GEnx-2B engines', '2026-01-15', '2026-02-15', 'Completed', 'Medium', 'Inspection and replacement of engine pylon drain mast assemblies to prevent fuel leak.', 'All four pylon drain masts replaced with improved P/N. Leak test satisfactory.', 'Robert Garcia', 'FAA-AD-2024-06-14'),
        ('AD-2025-02-25', 'E195-E2 Rudder Actuator Inspection', 'ANAC', 'Embraer E195-E2', 'All E195-E2 aircraft', NULL, '2026-05-25', 'Open', 'High', 'Detailed inspection of rudder power control module for hydraulic seal degradation.', NULL, NULL, 'ANAC-AD-2025-0003'),
        ('AD-2024-10-07', 'B757 Thrust Reverser Actuator Inspection', 'FAA', 'Boeing 757-200', 'B757-200 with PW2037 or PW2040 engines', '2025-07-12', '2025-10-30', 'Overdue', 'Critical', 'Inspection of thrust reverser hydraulic actuators for internal leakage and seal condition.', 'Parts on order; extension request submitted to FAA FSDO.', 'Michael Torres', 'FAA-AD-2024-10-07'),
        ('AD-2025-06-19', 'A220-300 Fuel Filter Bypass Valve', 'Transport Canada', 'Airbus A220-300', 'All A220-100 and A220-300 aircraft', NULL, '2026-08-19', 'Open', 'Medium', 'Replacement of engine fuel filter bypass valve with improved design to prevent uncommanded opening.', NULL, NULL, 'TC-AD-CF-2025-14'),
        ('AD-2025-03-08', 'A321XLR Center Fuel Tank Inspection', 'EASA', 'Airbus A321XLR', 'All A321XLR aircraft with rear center tank', NULL, '2026-09-08', 'Open', 'High', 'First inspection of rear center fuel tank structural provisions and sealant condition.', NULL, NULL, 'EASA-AD-2025-0044');
    `);
    console.log('Seeded: compliance_records (15 records)');

    // ── Seed Work Orders (15) ───────────────────────────────────────
    await pool.query(`
      INSERT INTO work_orders (wo_number, title, aircraft_reg, maintenance_type, priority, status, assigned_to, estimated_hours, actual_hours, labor_cost, parts_cost, description, notes, start_date, target_completion, completed_date) VALUES
        ('WO-2024-1001', 'A-Check Routine Inspection', 'N78501', 'A-Check', 'High', 'Open', 'Carlos Mendez', 48.00, NULL, 4800.00, 2500.00, 'Complete A-Check package for B737-800 including general visual inspection and operational tests.', 'Awaiting hangar slot confirmation.', '2026-03-20', '2026-03-25', NULL),
        ('WO-2024-1002', 'C-Check Heavy Maintenance', 'N44215', 'C-Check', 'Critical', 'In Progress', 'Team Bravo', 2200.00, 1100.00, 110000.00, 45000.00, 'Full C-Check package for A320neo including structural inspections and corrosion prevention.', 'Phase 1 complete. Structural inspection revealed minor corrosion at frame 42.', '2026-02-15', '2026-03-15', NULL),
        ('WO-2024-1003', 'GEnx Engine Hot Section Inspection', 'N90832', 'Engine Overhaul', 'High', 'Open', 'David Kim', 320.00, NULL, 32000.00, 48500.00, 'GEnx-1B engine hot section inspection and HPT blade replacement.', NULL, '2026-04-01', '2026-04-20', NULL),
        ('WO-2024-1004', 'Landing Gear Overhaul', 'N55678', 'Landing Gear', 'Medium', 'In Progress', 'Marcus Johnson', 72.00, 35.00, 3500.00, 12800.00, 'Main landing gear detailed inspection, brake assembly service, and tire replacement.', 'Left main gear actuator showing higher than normal wear.', '2026-03-18', '2026-03-22', NULL),
        ('WO-2024-1005', 'Avionics Software Update', 'N67892', 'Avionics', 'High', 'Open', 'Aisha Patel', 36.00, NULL, 3600.00, 800.00, 'MCAS software update v4.2 and FCC firmware upgrade per AD-2025-01-18.', 'Software media received and verified.', '2026-03-25', '2026-03-28', NULL),
        ('WO-2024-1006', 'Wing Corrosion Treatment', 'N81234', 'Structural', 'Medium', 'Completed', 'Ricardo Santos', 96.00, 88.00, 8800.00, 3200.00, 'Wing-to-body fairing corrosion treatment, blending, and resealing per SB A330-57-3042.', 'All corrosion within repairable limits. CPC applied and sealed.', '2026-03-10', '2026-03-14', '2026-03-13'),
        ('WO-2024-1007', 'APU Replacement', 'N61290', 'Powerplant', 'Medium', 'On Hold', 'Thomas Weber', 40.00, 8.00, 800.00, 35000.00, 'GTCP331-200 APU removal and replacement following EGT exceedance.', 'Replacement APU on order from vendor. ETA: 2026-03-25.', '2026-03-08', '2026-03-12', NULL),
        ('WO-2024-1008', 'B-Check Intermediate Inspection', 'N12045', 'B-Check', 'Medium', 'Completed', 'Emily Chen', 160.00, 152.00, 15200.00, 4100.00, 'B-Check package for E175 including filter replacements and system functional tests.', 'All items completed satisfactorily. Aircraft released to service.', '2026-02-28', '2026-03-05', '2026-03-04'),
        ('WO-2024-1009', 'Elevator Control Rod Replacement', 'N95411', 'Flight Controls', 'Critical', 'In Progress', 'James Wilson', 24.00, 12.00, 1200.00, 5600.00, 'Elevator control rod end bearing replacement per AD compliance.', 'Left side completed. Right side in progress.', '2026-03-15', '2026-03-17', NULL),
        ('WO-2024-1010', 'Lightning Strike Repair', 'N40567', 'Structural', 'High', 'In Progress', 'Structures Team', 120.00, 60.00, 6000.00, 8900.00, 'Fuselage skin repair at Station 470 following lightning strike damage.', 'NDT completed; damage contained to two skin panels. Repair scheme approved.', '2026-03-12', '2026-03-18', NULL),
        ('WO-2024-1011', 'D-Check Full Overhaul', 'N73001', 'D-Check', 'Critical', 'Completed', 'Team Echo', 6200.00, 6050.00, 302500.00, 185000.00, 'Complete D-Check overhaul for 747-8F including cargo conversion modification.', 'All tasks completed. Final inspection and airworthiness release issued.', '2025-12-01', '2026-02-28', '2026-02-26'),
        ('WO-2024-1012', 'Wheel and Brake Change', 'N88345', 'Landing Gear', 'Low', 'Open', 'Marcus Johnson', 12.00, NULL, 1200.00, 6500.00, 'Main wheel assembly replacement and carbon brake stack measurement.', NULL, '2026-03-22', '2026-03-23', NULL),
        ('WO-2024-1013', 'Weather Radar Calibration', 'N22098', 'Avionics', 'Low', 'Open', 'Aisha Patel', 8.00, NULL, 800.00, 500.00, 'Weather radar antenna alignment and system calibration following unit replacement.', NULL, '2026-04-05', '2026-04-06', NULL),
        ('WO-2024-1014', 'Engine Borescope Inspection', 'N95411', 'Engine', 'High', 'In Progress', 'David Kim', 8.00, 4.00, 400.00, 0.00, 'CF34-8C5 engine borescope inspection following oil consumption trend exceedance.', 'Stage 1 HPT blades showing sulfidation; serviceable but monitoring required.', '2026-03-15', '2026-03-16', NULL),
        ('WO-2024-1015', 'Cabin Reconfiguration', 'N37854', 'Interior', 'Low', 'Open', 'Interior Team', 200.00, NULL, 20000.00, 42000.00, 'Business class seat installation and IFE system upgrade for A220-300.', 'Seats and IFE units received and staged in warehouse.', '2026-05-10', '2026-05-20', NULL);
    `);
    console.log('Seeded: work_orders (15 records)');

    // ── Seed Inventory (15) ─────────────────────────────────────────
    await pool.query(`
      INSERT INTO inventory (part_number, part_name, category, quantity, min_quantity, unit_cost, location, warehouse, supplier, condition_code, certification, last_received, expiry_date) VALUES
        ('CFM56-7B-BLD', 'HPT Blade Set (Stage 1)', 'Engine', 4, 2, 28500.00, 'Rack E-101', 'Main Warehouse', 'CFM International', 'NEW', 'FAA 8130-3', '2026-02-15', NULL),
        ('5930-01-234', 'Generator Control Unit', 'Electrical', 6, 3, 12400.00, 'Rack A-205', 'Main Warehouse', 'GE Aviation Systems', 'NEW', 'EASA Form 1', '2026-01-10', NULL),
        ('270A1500-5', 'Main Landing Gear Actuator', 'Hydraulic', 2, 2, 45600.00, 'Rack H-302', 'Main Warehouse', 'Safran Landing Systems', 'OH', 'FAA 8130-3', '2025-11-20', NULL),
        ('MS21042L3', 'Self-Locking Nut (3/8-24)', 'Consumable', 2500, 500, 0.85, 'Bin C-042', 'Consumables Store', 'SPS Technologies', 'NEW', 'DFARS Compliant', '2026-03-01', '2028-03-01'),
        ('AS3209-012', 'O-Ring (Fluorocarbon)', 'Consumable', 1200, 200, 2.40, 'Bin C-108', 'Consumables Store', 'Parker Hannifin', 'NEW', 'AMS 7259', '2026-02-20', '2027-06-20'),
        ('4071842-901', 'Weather Radar Antenna', 'Avionics', 3, 1, 34200.00, 'Rack V-104', 'Avionics Store', 'Collins Aerospace', 'NEW', 'TSO-C63e', '2025-12-05', NULL),
        ('332A1100-3', 'Hydraulic Pump Assembly', 'Hydraulic', 5, 3, 18900.00, 'Rack H-201', 'Main Warehouse', 'Parker Aerospace', 'OH', 'FAA 8130-3', '2026-01-25', NULL),
        ('155W0100-04', 'Main Wheel Tire (H40x14.5-19)', 'Landing Gear', 12, 6, 1850.00, 'Rack L-010', 'Tire Store', 'Michelin Aircraft Tire', 'NEW', 'TSO-C62e', '2026-03-10', '2028-09-10'),
        ('1141AN10-5', 'Crew Oxygen Regulator', 'Safety', 8, 4, 3200.00, 'Rack S-015', 'Main Warehouse', 'B/E Aerospace', 'NEW', 'TSO-C89b', '2025-10-15', NULL),
        ('NAS1149F0363P', 'Washer (Flat, Cadmium)', 'Consumable', 5000, 1000, 0.12, 'Bin C-003', 'Consumables Store', 'National Aerospace Standards', 'NEW', 'AN Spec', '2026-03-05', '2029-03-05'),
        ('65C-31702-61', 'Flight Control Computer', 'Avionics', 2, 1, 89500.00, 'Rack V-201', 'Avionics Store', 'Honeywell Aerospace', 'NEW', 'TSO-C153a', '2025-09-30', NULL),
        ('APS3200-DUCT', 'APU Exhaust Duct Assembly', 'Powerplant', 1, 1, 7800.00, 'Rack P-044', 'Main Warehouse', 'Honeywell Aerospace', 'NEW', 'FAA 8130-3', '2025-08-12', NULL),
        ('501-1345-06', 'Inertial Reference Unit', 'Avionics', 3, 2, 76300.00, 'Rack V-305', 'Avionics Store', 'Northrop Grumman', 'OH', 'TSO-C4c', '2026-02-28', NULL),
        ('BMS5-95-TYPE2', 'Corrosion Preventive Compound', 'Consumable', 48, 12, 45.00, 'Shelf M-022', 'Chemical Store', 'Dow Corning', 'NEW', 'BMS 5-95 Type II', '2026-01-18', '2027-01-18'),
        ('BACS12GU3K8', 'Hi-Lock Pin (3/16 Dia)', 'Structural', 3200, 800, 1.65, 'Bin C-150', 'Consumables Store', 'Alcoa Fastening Systems', 'NEW', 'NAS Certified', '2026-03-12', NULL);
    `);
    console.log('Seeded: inventory (15 records)');

    // ── Seed Safety Incidents (15) ──────────────────────────────────
    await pool.query(`
      INSERT INTO safety_incidents (incident_number, title, incident_date, aircraft_reg, location, severity, category, reported_by, description, root_cause, corrective_action, status, investigation_lead, closure_date) VALUES
        ('INC-2024-001', 'FOD Found on Runway 27L During Inspection', '2026-01-15', NULL, 'Runway 27L', 'Major', 'FOD', 'John Rivera', 'Metal debris approximately 6 inches in length found during routine FOD walk on Runway 27L.', 'Debris traced to missing panel fastener from maintenance activity in Hangar A-1.', 'Implemented mandatory panel fastener count verification on all post-maintenance inspections.', 'Closed', 'Sarah Chen', '2026-02-10'),
        ('INC-2024-002', 'Bird Strike on Approach - Engine Ingestion', '2026-01-22', 'N78501', 'Approach RWY 09R', 'Critical', 'Bird Strike', 'Captain Williams', 'B737-800 encountered flock of Canada geese at 1500ft on approach. Left engine ingested 2 birds.', 'Seasonal bird migration pattern; inadequate wildlife management during peak hours.', 'Engine borescope satisfactory. Coordinated with airport wildlife management for enhanced dispersal.', 'Closed', 'Michael Torres', '2026-02-28'),
        ('INC-2024-003', 'Hydraulic Fluid Spill in Hangar B-2', '2026-02-05', 'N44215', 'Hangar B-2', 'Minor', 'Chemical Exposure', 'Ricardo Santos', 'Approximately 2 gallons of Skydrol hydraulic fluid spilled during C-Check hydraulic system drain.', 'Drain hose connection was not properly secured before opening valve.', 'Revised hydraulic drain SOP to include two-person verification of hose connections.', 'Closed', 'Linda Park', '2026-02-15'),
        ('INC-2024-004', 'Unaccounted Tool Found Inside Wing Access Panel', '2026-02-12', 'N81234', 'Hangar B-1', 'Major', 'Tool Control', 'Emily Chen', 'Flashlight found inside wing access panel during close-out inspection of A330-300 corrosion repair.', 'Shadow board check not completed at end of shift. Tool belonged to previous shift technician.', 'Mandatory shift-end tool verification with supervisor sign-off. RFID tool tracking under evaluation.', 'Closed', 'James Mitchell', '2026-03-01'),
        ('INC-2024-005', 'Ground Vehicle Collision with Aircraft Nose Gear', '2026-02-18', 'N22098', 'Gate B-14', 'Major', 'Ground Damage', 'Ramp Supervisor Davis', 'Belt loader contacted nose gear door of B767-300F during cargo loading operation in rain.', 'Wet ramp conditions and operator visibility restricted. Speed exceeded 5 mph limit.', 'Nose gear door replaced. Operator retrained. Mandatory speed reduction during wet conditions.', 'Closed', 'Robert Garcia', '2026-03-10'),
        ('INC-2024-006', 'Technician Hand Laceration During Panel Removal', '2026-02-25', 'N33190', 'Hangar C-1', 'Minor', 'Personnel Injury', 'Marcus Johnson', 'Technician sustained 3cm laceration on left hand while removing corroded access panel during D-Check.', 'Panel edge was corroded and sharp. Technician not wearing cut-resistant gloves.', 'First aid administered. Cut-resistant gloves now mandatory for panel removal tasks.', 'Closed', 'Sarah Chen', '2026-03-05'),
        ('INC-2024-007', 'Fuel Leak Detected During Post-Maintenance Check', '2026-03-02', 'N12045', 'Hangar A-3', 'Major', 'Fuel Leak', 'Thomas Weber', 'Fuel leak from left wing fuel tank drain valve discovered during post-B-Check fuel system test.', 'Drain valve O-ring was damaged during reinstallation. Incorrect torque applied.', 'O-ring replaced, valve re-torqued per AMM specifications. Added torque verification step.', 'In Progress', 'Michael Torres', NULL),
        ('INC-2024-008', 'Near Miss - Tow Vehicle and Taxiing Aircraft', '2026-03-05', 'N55678', 'Taxiway Charlie', 'Critical', 'Ground Damage', 'Tower Controller Adams', 'Tow vehicle crossed active taxiway without clearance while B777-300ER was taxiing for departure.', 'Tow vehicle operator failed to contact ground control before crossing taxiway.', 'Under investigation. Temporary restriction on all vehicle movements near active taxiways.', 'In Progress', 'Robert Garcia', NULL),
        ('INC-2024-009', 'Composite Dust Exposure Without Respiratory Protection', '2026-03-08', 'N40567', 'Hangar C-2', 'Minor', 'Chemical Exposure', 'Safety Officer Kim', 'Two technicians found sanding composite repair on A321XLR without wearing required P100 respirators.', 'Technicians were unaware composite repair was in progress in adjacent work area.', 'Enhanced barrier and signage requirements for composite work zones. Refresher training scheduled.', 'Open', 'Linda Park', NULL),
        ('INC-2024-010', 'Dropped Engine Component During Installation', '2026-03-10', 'N90832', 'Engine Bay 1', 'Major', 'Dropped Object', 'David Kim', 'Fuel nozzle assembly (approx 15 lbs) dropped 4 feet during GEnx engine reassembly.', 'Lifting fixture safety latch was not engaged. Single-person lift attempted for two-person task.', 'Component sent for inspection. Reinforced two-person lift requirement for components over 10 lbs.', 'In Progress', 'James Mitchell', NULL),
        ('INC-2024-011', 'Incorrect Part Installed on Aircraft', '2026-03-11', 'N95411', 'Hangar A-2', 'Major', 'Maintenance Error', 'Quality Inspector Walsh', 'Wrong P/N hydraulic filter installed on CRJ-900 left engine hydraulic system during routine change.', 'Similar part numbers between CRJ-700 and CRJ-900 filters. Bin labels were faded.', 'Part replaced with correct P/N. Bin labeling system upgraded with barcoding.', 'In Progress', 'Sarah Chen', NULL),
        ('INC-2024-012', 'Smoke Detected in Avionics Bay During Test', '2026-03-13', 'N67892', 'Avionics Bay 2', 'Critical', 'Electrical', 'Aisha Patel', 'Smoke and burning smell from avionics bay during power-up test of B737 MAX after FCC installation.', 'Under investigation. Preliminary assessment suggests a wire bundle chafing against structure.', 'Power isolated. Full wiring inspection of avionics bay in progress.', 'Open', 'Michael Torres', NULL),
        ('INC-2024-013', 'Crane Load Cell Failure During Engine Lift', '2026-03-14', 'N61290', 'Hangar A-1', 'Critical', 'Equipment Failure', 'Thomas Weber', 'Overhead crane load cell displayed erratic readings during APU removal lift on B757-200.', 'Load cell calibration was overdue by 2 weeks. Annual inspection not tracked.', 'Lift suspended safely. All crane load cells sent for calibration. Equipment tracking system updated.', 'Open', 'Robert Garcia', NULL),
        ('INC-2024-014', 'Jet Blast Injury to Ground Personnel', '2026-03-16', 'N73001', 'Ramp Area North', 'Major', 'Personnel Injury', 'Ramp Manager Collins', 'Ground handler knocked down by jet blast from B747-8F engine run-up. Minor back strain reported.', 'Exclusion zone barricades were not set up for engine ground run. Communication breakdown.', 'Employee treated and released. Engine run procedures revised to require safety team marshalling.', 'Open', 'James Mitchell', NULL),
        ('INC-2024-015', 'Lightning Strike Damage Not Initially Detected', '2026-03-17', 'N40567', 'Gate C-7', 'Major', 'Maintenance Error', 'Captain Hernandez', 'Crew reported lightning strike during flight. Initial post-flight inspection cleared aircraft; damage found next day.', 'Night inspection conditions insufficient for thorough lightning strike assessment.', 'Under investigation. Enhanced lightning strike inspection protocol with daylight requirement proposed.', 'Open', 'Sarah Chen', NULL);
    `);
    console.log('Seeded: safety_incidents (15 records)');

    // ── Seed Technicians (15) ───────────────────────────────────────
    await pool.query(`
      INSERT INTO technicians (employee_id, name, email, phone, specialization, license_type, license_number, license_expiry, certifications, rating, status, hire_date, total_experience_years) VALUES
        ('EMP-101', 'Carlos Mendez', 'cmendez@aeromro.com', '555-0101', 'Powerplant', 'A&P', 'AP-2018-44521', '2027-06-15', ARRAY['GEnx Authorized', 'CFM56 Type Rating', 'EWIS'], 'A', 'Active', '2018-03-15', 12),
        ('EMP-102', 'Emily Chen', 'echen@aeromro.com', '555-0102', 'Avionics', 'A&P', 'AP-2016-33218', '2027-04-20', ARRAY['FCC Level 3', 'TCAS II', 'HF/VHF Systems', 'EFB'], 'A', 'Active', '2016-07-01', 15),
        ('EMP-103', 'Marcus Johnson', 'mjohnson@aeromro.com', '555-0103', 'Landing Gear', 'A&P', 'AP-2019-55102', '2027-09-30', ARRAY['Brake Systems', 'Wheel Assembly', 'NDT Level II'], 'A', 'Active', '2019-01-20', 10),
        ('EMP-104', 'David Kim', 'dkim@aeromro.com', '555-0104', 'Powerplant', 'A&P/IA', 'IA-2015-22187', '2026-12-31', ARRAY['GE90 Type Rating', 'GEnx Type Rating', 'CF34 Type Rating', 'Borescope Certified'], 'A', 'Active', '2015-05-10', 18),
        ('EMP-105', 'Aisha Patel', 'apatel@aeromro.com', '555-0105', 'Avionics', 'A&P', 'AP-2020-61034', '2027-11-15', ARRAY['MCAS Certified', 'ADS-B', 'SATCOM', 'Glass Cockpit'], 'B', 'Active', '2020-09-01', 8),
        ('EMP-106', 'Ricardo Santos', 'rsantos@aeromro.com', '555-0106', 'Structures', 'A&P', 'AP-2017-47893', '2027-03-28', ARRAY['Composites Repair', 'Sheet Metal', 'Corrosion Control', 'SRM Authorized'], 'A', 'Active', '2017-11-15', 14),
        ('EMP-107', 'Thomas Weber', 'tweber@aeromro.com', '555-0107', 'Powerplant', 'A&P', 'AP-2021-72456', '2028-01-20', ARRAY['PW4000 Type Rating', 'APU Systems', 'FADEC'], 'B', 'Active', '2021-04-05', 7),
        ('EMP-108', 'James Wilson', 'jwilson@aeromro.com', '555-0108', 'Flight Controls', 'A&P/IA', 'IA-2014-18923', '2026-08-15', ARRAY['Fly-By-Wire', 'Autopilot Systems', 'Hydraulic Flight Controls'], 'A', 'Active', '2014-02-28', 20),
        ('EMP-109', 'Sarah Chen', 'schen@aeromro.com', '555-0109', 'NDT', 'A&P', 'AP-2016-38761', '2027-05-10', ARRAY['NDT Level III', 'Eddy Current', 'Ultrasonic', 'Radiographic', 'Magnetic Particle'], 'A', 'Active', '2016-08-22', 16),
        ('EMP-110', 'Michael Torres', 'mtorres@aeromro.com', '555-0110', 'Electrical', 'A&P/IA', 'IA-2013-15504', '2026-11-30', ARRAY['EWIS Specialist', 'High Voltage', 'Generator Systems', 'FCC Licensed'], 'A', 'Active', '2013-06-14', 22),
        ('EMP-111', 'Linda Park', 'lpark@aeromro.com', '555-0111', 'Composites', 'A&P', 'AP-2019-59871', '2027-07-25', ARRAY['Advanced Composites', 'Bonded Repairs', 'Autoclave Operations', 'Honeycomb Repair'], 'A', 'Active', '2019-10-01', 9),
        ('EMP-112', 'Robert Garcia', 'rgarcia@aeromro.com', '555-0112', 'Sheet Metal', 'A&P', 'AP-2018-42310', '2027-02-14', ARRAY['Structural Repair', 'Riveting', 'Pressurization Repairs', 'DER Repairs'], 'B', 'Active', '2018-06-20', 11),
        ('EMP-113', 'Yuki Tanaka', 'ytanaka@aeromro.com', '555-0113', 'Avionics', 'FCC', 'FCC-2020-88134', '2027-08-30', ARRAY['Radar Systems', 'Navigation Systems', 'RVSM', 'CPDLC'], 'A', 'Active', '2020-03-15', 8),
        ('EMP-114', 'Hans Mueller', 'hmueller@aeromro.com', '555-0114', 'Structures', 'A&P', 'AP-2022-81045', '2028-04-10', ARRAY['Corrosion Control', 'Fatigue Repair', 'NDT Level I'], 'C', 'Active', '2022-08-01', 4),
        ('EMP-115', 'Olga Petrov', 'opetrov@aeromro.com', '555-0115', 'Electrical', 'A&P', 'AP-2017-45678', '2027-10-05', ARRAY['Wiring Systems', 'Lighting', 'Battery Systems', 'Emergency Power'], 'A', 'On Leave', '2017-01-10', 13);
    `);
    console.log('Seeded: technicians (15 records)');

    // ── Seed Fleet Health (15) ──────────────────────────────────────
    await pool.query(`
      INSERT INTO fleet_health (aircraft_reg, aircraft_type, operator, total_flight_hours, total_cycles, last_major_check, last_check_date, next_check_due, health_score, engine_status, avionics_status, airframe_status, landing_gear_status, apu_status, notes) VALUES
        ('N78501', 'Boeing 737-800', 'AeroMRO Airlines', 42500.00, 28300, 'C-Check', '2025-06-15', '2026-06-15', 88, 'Normal', 'Normal', 'Normal', 'Normal', 'Normal', 'Aircraft in good overall condition. Next C-Check in 3 months.'),
        ('N44215', 'Airbus A320neo', 'AeroMRO Airlines', 18750.00, 12500, 'A-Check', '2025-11-20', '2026-05-20', 72, 'Normal', 'Caution', 'Normal', 'Normal', 'Normal', 'Currently in C-Check. Avionics bus intermittent fault under investigation.'),
        ('N90832', 'Boeing 787-9', 'AeroMRO Airlines', 31200.00, 8900, 'C-Check', '2024-12-01', '2026-12-01', 82, 'Caution', 'Normal', 'Normal', 'Normal', 'Normal', 'Engine trend monitoring showing slight EGT margin deterioration on #1 engine.'),
        ('N33190', 'Airbus A350-900', 'AeroMRO Airlines', 27800.00, 9200, 'C-Check', '2024-08-10', '2026-08-10', 45, 'Normal', 'Normal', 'Warning', 'Normal', 'Caution', 'In D-Check. Significant corrosion found in forward cargo bay. APU showing elevated oil consumption.'),
        ('N55678', 'Boeing 777-300ER', 'AeroMRO Airlines', 65200.00, 18100, 'C-Check', '2025-09-01', '2026-09-01', 78, 'Normal', 'Normal', 'Normal', 'Caution', 'Normal', 'Landing gear approaching overhaul interval. Main gear actuator wear being monitored.'),
        ('N12045', 'Embraer E175', 'AeroMRO Regional', 22100.00, 24800, 'B-Check', '2026-03-04', '2026-09-04', 94, 'Normal', 'Normal', 'Normal', 'Normal', 'Normal', 'Recently completed B-Check. Aircraft in excellent condition.'),
        ('N67892', 'Boeing 737 MAX 8', 'AeroMRO Airlines', 8900.00, 5900, 'A-Check', '2025-12-10', '2026-06-10', 91, 'Normal', 'Normal', 'Normal', 'Normal', 'Normal', 'Relatively new aircraft. MCAS software update pending per AD compliance.'),
        ('N81234', 'Airbus A330-300', 'AeroMRO Airlines', 58400.00, 16200, 'C-Check', '2025-03-20', '2026-09-20', 76, 'Normal', 'Normal', 'Caution', 'Normal', 'Normal', 'Wing-to-body fairing corrosion treated. Monitoring for recurrence.'),
        ('N22098', 'Boeing 767-300F', 'AeroMRO Cargo', 72300.00, 22400, 'C-Check', '2025-07-15', '2026-07-15', 68, 'Caution', 'Normal', 'Caution', 'Normal', 'Warning', 'High-utilization freighter. APU approaching end of life. Fuselage lap joints require monitoring.'),
        ('N95411', 'Bombardier CRJ-900', 'AeroMRO Regional', 38600.00, 32100, 'A-Check', '2025-10-20', '2026-04-20', 61, 'Warning', 'Normal', 'Normal', 'Normal', 'Normal', 'Engine oil consumption above normal limits. Borescope inspection in progress.'),
        ('N40567', 'Airbus A321XLR', 'AeroMRO Airlines', 5200.00, 3400, 'A-Check', '2025-12-01', '2026-06-01', 85, 'Normal', 'Normal', 'Caution', 'Normal', 'Normal', 'New aircraft with lightning strike damage under repair at Station 470.'),
        ('N73001', 'Boeing 747-8F', 'AeroMRO Cargo', 48900.00, 11200, 'D-Check', '2026-02-26', '2030-02-26', 98, 'Normal', 'Normal', 'Normal', 'Normal', 'Normal', 'Just completed D-Check overhaul. All systems renewed. Highest fleet health score.'),
        ('N88345', 'Embraer E195-E2', 'AeroMRO Regional', 6800.00, 7500, 'A-Check', '2026-01-15', '2026-07-15', 92, 'Normal', 'Normal', 'Normal', 'Caution', 'Normal', 'Main wheel tire wear approaching limits. Wheel and brake change scheduled.'),
        ('N61290', 'Boeing 757-200', 'AeroMRO Airlines', 78500.00, 35200, 'C-Check', '2025-04-10', '2026-10-10', 55, 'Normal', 'Caution', 'Caution', 'Normal', 'Critical', 'Aging aircraft. APU unserviceable - replacement on order. Thrust reverser AD overdue.'),
        ('N37854', 'Airbus A220-300', 'AeroMRO Airlines', 12400.00, 8200, 'A-Check', '2025-11-05', '2026-05-05', 89, 'Normal', 'Normal', 'Normal', 'Normal', 'Normal', 'Young fleet aircraft in good condition. Cabin reconfiguration planned for Q2 2026.');
    `);
    console.log('Seeded: fleet_health (15 records)');

    // ── Seed Vendors (15) ───────────────────────────────────────────
    await pool.query(`
      INSERT INTO vendors (vendor_code, company_name, contact_name, email, phone, address, city, country, specialization, rating, contract_start, contract_end, payment_terms, status, total_orders, total_spent) VALUES
        ('VND-001', 'Pratt & Whitney Parts Supply', 'Jennifer Adams', 'jadams@pw-parts.com', '+1-860-555-0100', '400 Main Street', 'East Hartford', 'United States', 'Engine Components & Overhaul Services', 4.85, '2024-01-01', '2027-12-31', 'Net 60', 'Active', 145, 2850000.00),
        ('VND-002', 'Honeywell Aerospace Services', 'Mark Thompson', 'mthompson@honeywell.com', '+1-602-555-0200', '1944 E Sky Harbor Blvd', 'Phoenix', 'United States', 'APU, Avionics & Environmental Control Systems', 4.72, '2023-06-01', '2026-05-31', 'Net 45', 'Active', 198, 1920000.00),
        ('VND-003', 'Safran Landing Systems', 'Pierre Dubois', 'pdubois@safran-ls.com', '+33-1-555-0300', '5 Rue Georges Guynemer', 'Velizy-Villacoublay', 'France', 'Landing Gear & Braking Systems', 4.90, '2024-03-01', '2027-02-28', 'Net 60', 'Active', 67, 3450000.00),
        ('VND-004', 'Collins Aerospace Distribution', 'Rachel Foster', 'rfoster@collins.com', '+1-319-555-0400', '400 Collins Road NE', 'Cedar Rapids', 'United States', 'Avionics, Communication & Navigation Systems', 4.65, '2023-09-01', '2026-08-31', 'Net 30', 'Active', 234, 4120000.00),
        ('VND-005', 'Parker Aerospace Hydraulics', 'Steven Wright', 'swright@parker.com', '+1-949-555-0500', '14300 Alton Parkway', 'Irvine', 'United States', 'Hydraulic Systems & Fluid Conveyance', 4.50, '2024-01-01', '2026-12-31', 'Net 45', 'Active', 312, 890000.00),
        ('VND-006', 'Lufthansa Technik AG', 'Klaus Becker', 'kbecker@lht.de', '+49-40-555-0600', 'Weg beim Jaeger 193', 'Hamburg', 'Germany', 'MRO Services, Engine Overhaul & Component Repair', 4.95, '2023-01-01', '2027-12-31', 'Net 90', 'Active', 42, 8750000.00),
        ('VND-007', 'GE Aviation Materials', 'Laura Martinez', 'lmartinez@ge.com', '+1-513-555-0700', '1 Neumann Way', 'Cincinnati', 'United States', 'Engine Parts, Hot Section Components', 4.80, '2024-06-01', '2027-05-31', 'Net 60', 'Active', 178, 5620000.00),
        ('VND-008', 'Michelin Aircraft Tire Company', 'Claude Moreau', 'cmoreau@michelin-air.com', '+33-4-555-0800', 'Place des Carmes-Dechaux', 'Clermont-Ferrand', 'France', 'Aircraft Tires & Retreading Services', 4.40, '2024-01-01', '2026-12-31', 'Net 30', 'Active', 89, 320000.00),
        ('VND-009', 'B/E Aerospace (now Raytheon)', 'Daniel Cooper', 'dcooper@raytheon.com', '+1-305-555-0900', '1400 Corporate Center Way', 'Wellington', 'United States', 'Cabin Interior, Oxygen Systems & Lighting', 4.30, '2023-04-01', '2026-03-31', 'Net 45', 'Active', 156, 680000.00),
        ('VND-010', 'Northrop Grumman Navigation', 'Karen Nguyen', 'knguyen@northrop.com', '+1-818-555-1000', '21240 Burbank Blvd', 'Woodland Hills', 'United States', 'Inertial Navigation & Reference Systems', 4.88, '2024-02-01', '2027-01-31', 'Net 60', 'Active', 28, 2140000.00),
        ('VND-011', 'SPS Technologies (PCC)', 'Brian O''Malley', 'bomalley@sps-tech.com', '+1-215-555-1100', '301 Highland Avenue', 'Jenkintown', 'United States', 'Aerospace Fasteners & Hardware', 4.20, '2023-01-01', '2026-12-31', 'Net 30', 'Active', 520, 185000.00),
        ('VND-012', 'Heico Corporation', 'Maria Rodriguez', 'mrodriguez@heico.com', '+1-954-555-1200', '3000 Taft Street', 'Hollywood', 'United States', 'PMA Parts, Electronic Components & Repair', 4.55, '2024-04-01', '2027-03-31', 'Net 45', 'Active', 287, 1560000.00),
        ('VND-013', 'ST Engineering Aerospace', 'Wei Lin Tan', 'wltan@stengg.com', '+65-6555-1300', '540 Airport Road', 'Singapore', 'Singapore', 'Heavy Maintenance, Painting & Modification', 4.75, '2023-07-01', '2026-06-30', 'Net 60', 'Active', 18, 4200000.00),
        ('VND-014', 'Aviall Services (Boeing)', 'Christopher Davis', 'cdavis@aviall.com', '+1-972-555-1400', '2750 Regent Blvd', 'Dallas', 'United States', 'Aircraft Parts Distribution & Supply Chain', 4.60, '2024-01-01', '2026-12-31', 'Net 30', 'Active', 892, 2340000.00),
        ('VND-015', 'MTU Aero Engines', 'Hans Zimmermann', 'hzimmermann@mtu.de', '+49-89-555-1500', 'Dachauer Strasse 665', 'Munich', 'Germany', 'Engine MRO, Module Overhaul & LLP Management', 4.92, '2023-10-01', '2027-09-30', 'Net 90', 'Active', 35, 6890000.00);
    `);
    console.log('Seeded: vendors (15 records)');

    // ── Create & Seed Tool Calibration (15) ───────────────────────
    await pool.query(`
      CREATE TABLE tool_calibration (
        id SERIAL PRIMARY KEY,
        tool_id VARCHAR(50) UNIQUE,
        tool_name VARCHAR(200),
        category VARCHAR(100),
        manufacturer VARCHAR(100),
        model_number VARCHAR(100),
        serial_number VARCHAR(100),
        calibration_date DATE,
        next_calibration DATE,
        calibration_interval_days INTEGER DEFAULT 365,
        calibration_standard VARCHAR(200),
        location VARCHAR(100),
        assigned_to VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Calibrated',
        accuracy_rating VARCHAR(20) DEFAULT 'Pass',
        certificate_number VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created table: tool_calibration');

    await pool.query(`
      INSERT INTO tool_calibration (tool_id, tool_name, category, manufacturer, model_number, serial_number, calibration_date, next_calibration, calibration_interval_days, calibration_standard, location, assigned_to, status, accuracy_rating, certificate_number, notes) VALUES
        ('TL-001', 'Digital Torque Wrench 50-250 ft-lb', 'Torque Tools', 'Snap-on', 'TECH4FR250', 'SN-40281', '2026-01-15', '2026-07-15', 180, 'ISO 6789:2017', 'Tool Crib A', 'Mike Chen', 'Calibrated', 'Pass', 'CAL-2026-0015', 'Annual calibration completed, within spec at all test points'),
        ('TL-002', 'Fluke 87V Digital Multimeter', 'Electrical Test', 'Fluke', '87V', 'SN-51093', '2025-11-20', '2026-11-20', 365, 'NIST Traceable', 'Avionics Shop', 'Sarah Kim', 'Calibrated', 'Pass', 'CAL-2025-0892', 'All ranges verified within 0.05% accuracy'),
        ('TL-003', 'Pressure Gauge 0-5000 PSI', 'Pressure Instruments', 'Ashcroft', '1082S', 'SN-62847', '2025-09-10', '2026-03-10', 180, 'ASME B40.100', 'Hydraulic Shop', 'Dave Wilson', 'Due', 'Pass', 'CAL-2025-0673', 'Calibration due - schedule with lab'),
        ('TL-004', 'Bore Gauge 2-6 inch', 'Dimensional', 'Mitutoyo', '511-753', 'SN-73019', '2026-02-01', '2027-02-01', 365, 'ISO 17025', 'Engine Shop', 'Robert Taylor', 'Calibrated', 'Pass', 'CAL-2026-0102', 'All anvils checked and verified'),
        ('TL-005', 'Ultrasonic Thickness Gauge', 'NDT Equipment', 'Olympus', '38DL Plus', 'SN-84562', '2025-12-05', '2026-06-05', 180, 'ASTM E797', 'NDT Lab', 'Jennifer Lee', 'Calibrated', 'Pass', 'CAL-2025-0941', 'Step wedge calibration verified to 0.001 inch'),
        ('TL-006', 'Tensiometer Cable Tension', 'Rigging Tools', 'Pacific Scientific', 'T5-2002-108', 'SN-95201', '2025-08-15', '2026-02-15', 180, 'Mil-Spec', 'Hangar A', 'Tom Anderson', 'Overdue', 'N/A', 'CAL-2025-0512', 'OVERDUE - Remove from service until recalibrated'),
        ('TL-007', 'Eddy Current Probe Set', 'NDT Equipment', 'Zetec', 'MIZ-21C', 'SN-10938', '2026-01-20', '2026-07-20', 180, 'ASNT SNT-TC-1A', 'NDT Lab', 'Jennifer Lee', 'Calibrated', 'Pass', 'CAL-2026-0034', 'Reference standards verified, coil impedance nominal'),
        ('TL-008', 'Hydraulic Test Stand', 'Test Equipment', 'Parker Hannifin', 'HTS-500', 'SN-21045', '2025-10-01', '2026-10-01', 365, 'SAE AS5440', 'Hydraulic Shop', 'Dave Wilson', 'Calibrated', 'Pass', 'CAL-2025-0756', 'Flow and pressure transducers calibrated'),
        ('TL-009', 'Megohmmeter 5000V', 'Electrical Test', 'Megger', 'MIT525', 'SN-32478', '2026-03-01', '2027-03-01', 365, 'IEC 61557', 'Electrical Shop', 'Chris Brown', 'Calibrated', 'Pass', 'CAL-2026-0189', 'Insulation resistance ranges verified'),
        ('TL-010', 'Precision Micrometer Set 0-6in', 'Dimensional', 'Starrett', 'S436CXRLZ', 'SN-43560', '2025-07-20', '2026-01-20', 180, 'ANSI/ASME B89.1.6', 'Tool Crib B', 'Mike Chen', 'Overdue', 'N/A', 'CAL-2025-0389', 'OVERDUE - Send to calibration lab immediately'),
        ('TL-011', 'Pitot-Static Test Set', 'Avionics Test', 'DMA-Aero', 'MPS43', 'SN-54721', '2026-02-15', '2026-08-15', 180, 'FAR 43 App E', 'Avionics Shop', 'Sarah Kim', 'Calibrated', 'Pass', 'CAL-2026-0145', 'Altitude, airspeed, and VSI channels verified'),
        ('TL-012', 'Surface Roughness Tester', 'Dimensional', 'Mahr', 'MarSurf PS10', 'SN-65892', '2025-11-10', '2026-11-10', 365, 'ISO 4287', 'Machine Shop', 'Alex Martinez', 'Calibrated', 'Pass', 'CAL-2025-0867', 'Ra and Rz parameters within specification'),
        ('TL-013', 'Thermal Imaging Camera', 'Inspection', 'FLIR', 'E96', 'SN-76103', '2026-01-05', '2027-01-05', 365, 'IEC 62464-1', 'NDT Lab', 'Jennifer Lee', 'Calibrated', 'Pass', 'CAL-2026-0012', 'Blackbody reference verified, emissivity correction nominal'),
        ('TL-014', 'Spring Scale 0-50 lbs', 'Force Measurement', 'Chatillon', 'IN-50', 'SN-87234', '2025-06-01', '2025-12-01', 180, 'ASTM E4', 'Tool Crib A', 'Tom Anderson', 'Out of Service', 'Fail', 'CAL-2025-0298', 'Failed calibration - nonlinear above 35 lbs, needs repair'),
        ('TL-015', 'Digital Protractor/Inclinometer', 'Dimensional', 'Bosch', 'GAM 270 MFL', 'SN-98345', '2026-03-10', '2026-09-10', 180, 'DIN 2272', 'Structures Shop', 'Robert Taylor', 'Calibrated', 'Pass', 'CAL-2026-0201', 'Angle measurement verified against sine bar reference');
    `);
    console.log('Seeded: tool_calibration (15 records)');

    // ── Create & Seed MEL Items (15) ──────────────────────────────
    await pool.query(`
      CREATE TABLE mel_items (
        id SERIAL PRIMARY KEY,
        mel_number VARCHAR(50) UNIQUE,
        aircraft_reg VARCHAR(20),
        ata_chapter VARCHAR(20),
        title VARCHAR(300),
        description TEXT,
        category VARCHAR(10) DEFAULT 'C',
        deferral_date DATE,
        expiry_date DATE,
        rectification_interval VARCHAR(50),
        status VARCHAR(50) DEFAULT 'Active',
        operational_restriction TEXT,
        maintenance_action TEXT,
        deferred_by VARCHAR(100),
        approved_by VARCHAR(100),
        rectified_date DATE,
        rectified_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created table: mel_items');

    await pool.query(`
      INSERT INTO mel_items (mel_number, aircraft_reg, ata_chapter, title, description, category, deferral_date, expiry_date, rectification_interval, status, operational_restriction, maintenance_action, deferred_by, approved_by, rectified_date, rectified_by) VALUES
        ('MEL-2026-001', 'N78501', '34', 'Navigation Display #2 Inoperative', 'Right-side navigation display shows intermittent blank screen. Left display functional.', 'C', '2026-03-15', '2026-03-25', '10 calendar days', 'Active', 'Dispatch with one nav display. Crew must verify LNAV on operative display.', 'Replace ND unit P/N 501-0321-07', 'Mike Chen', 'John Davis', NULL, NULL),
        ('MEL-2026-002', 'N44215', '32', 'Nose Landing Gear Steering Bypass', 'NLG steering system shimmy dampener leaking. Towed ops only until repaired.', 'B', '2026-03-18', '2026-03-21', '3 calendar days', 'Active', 'Aircraft must be towed to/from gate. No taxi operations.', 'Replace shimmy dampener assembly', 'Dave Wilson', 'John Davis', NULL, NULL),
        ('MEL-2026-003', 'N90832', '21', 'Pack 2 Air Conditioning Inoperative', 'Right pack fails to maintain selected temperature. Left pack operational.', 'C', '2026-03-10', '2026-03-20', '10 calendar days', 'Active', 'Max altitude FL350. Passenger cabin may not exceed 200 PAX.', 'Troubleshoot pack valve and flow control', 'Sarah Kim', 'Maria Lopez', NULL, NULL),
        ('MEL-2026-004', 'N55678', '26', 'Fire Detection Loop B - Engine #1', 'Engine #1 fire detection loop B failed continuity check. Loop A operational.', 'A', '2026-03-19', '2026-03-19', 'As specified in MEL', 'Active', 'ETOPS prohibited. Engine start requires continuous fire watch.', 'Replace fire detection loop sensor harness', 'Chris Brown', 'John Davis', NULL, NULL),
        ('MEL-2026-005', 'N12045', '33', 'Cabin Pressure Controller Alternate', 'Primary cabin pressure controller failed auto mode. Alternate controller selected.', 'D', '2026-03-01', '2026-06-29', '120 calendar days', 'Active', 'Flight crew must monitor cabin altitude. Auto pressurization via alternate.', 'Replace primary cabin pressure controller', 'Tom Anderson', 'Maria Lopez', NULL, NULL),
        ('MEL-2026-006', 'N67892', '27', 'Flap Asymmetry Protection Inop', 'Flap asymmetry detection system failed BITE test. Manual reversion available.', 'B', '2026-03-17', '2026-03-20', '3 calendar days', 'Active', 'Flap selection limited to 1 degree per second. Visual asymmetry check required.', 'Replace flap asymmetry detection module', 'Mike Chen', 'John Davis', NULL, NULL),
        ('MEL-2026-007', 'N81234', '23', 'CVR Inoperative', 'Cockpit voice recorder failed self-test. Unit not recording.', 'A', '2026-03-19', '2026-03-19', 'As specified in MEL', 'Active', 'Aircraft may be dispatched for max 72 hours per FAR 91.609.', 'Replace CVR unit and verify recording', 'Sarah Kim', 'John Davis', NULL, NULL),
        ('MEL-2026-008', 'N33190', '28', 'Fuel Quantity Indicator Tank 2', 'Center tank fuel quantity indication reads zero regardless of fuel load.', 'C', '2026-03-12', '2026-03-22', '10 calendar days', 'Active', 'Center tank must be empty or full. Fuel load verified by drip stick.', 'Replace fuel quantity probe assembly', 'Dave Wilson', 'Maria Lopez', NULL, NULL),
        ('MEL-2026-009', 'N78501', '52', 'Emergency Exit Light Row 12R', 'One emergency exit path light inoperative at row 12 right side.', 'D', '2026-02-15', '2026-06-15', '120 calendar days', 'Rectified', 'Adjacent lights provide adequate illumination. No restriction.', 'Replace LED light strip assembly', 'Tom Anderson', 'Maria Lopez', '2026-03-10', 'Alex Martinez'),
        ('MEL-2026-010', 'N90832', '29', 'Hydraulic System 2 Low Pressure', 'System 2 hydraulic pressure intermittently drops below normal. System 1 and 3 normal.', 'C', '2026-03-14', '2026-03-24', '10 calendar days', 'Active', 'Alternate gear extension procedure reviewed with crew.', 'Check hydraulic pump and pressure relief valve', 'Chris Brown', 'John Davis', NULL, NULL),
        ('MEL-2026-011', 'N44215', '24', 'AC Generator #2 Inoperative', 'Right engine-driven generator tripped offline. Bus tie auto-connected.', 'B', '2026-03-18', '2026-03-21', '3 calendar days', 'Active', 'Galley power limited. Non-essential buses may be shed.', 'Replace generator control unit and test', 'Mike Chen', 'Maria Lopez', NULL, NULL),
        ('MEL-2026-012', 'N55678', '22', 'Auto-Throttle System Inoperative', 'Auto-throttle fails to engage. Manual thrust control required.', 'C', '2026-03-11', '2026-03-21', '10 calendar days', 'Rectified', 'Manual thrust required for all phases. Cat II/III approaches prohibited.', 'Replace auto-throttle servo actuator', 'Dave Wilson', 'John Davis', '2026-03-18', 'Robert Taylor'),
        ('MEL-2026-013', 'N67892', '35', 'Supplemental Oxygen Mask - Seat 14A', 'One passenger oxygen mask deployment mechanism jammed at seat 14A.', 'D', '2026-03-05', '2026-07-03', '120 calendar days', 'Active', 'Seat 14A must remain unoccupied until repaired.', 'Replace oxygen mask deployment mechanism', 'Sarah Kim', 'Maria Lopez', NULL, NULL),
        ('MEL-2026-014', 'N81234', '31', 'FMS Database Expired', 'Flight management system navigation database past validity date.', 'B', '2026-03-19', '2026-03-22', '3 calendar days', 'Active', 'RNAV approaches prohibited. Conventional navigation only.', 'Upload current AIRAC cycle database', 'Chris Brown', 'John Davis', NULL, NULL),
        ('MEL-2026-015', 'N12045', '36', 'Bleed Air Leak Detection Zone 3', 'Wing zone 3 bleed air leak detection loop failed. No leak indicated.', 'C', '2026-03-16', '2026-03-26', '10 calendar days', 'Active', 'Pre-flight bleed duct visual inspection required by maintenance.', 'Replace overheat detection element in zone 3', 'Tom Anderson', 'Maria Lopez', NULL, NULL);
    `);
    console.log('Seeded: mel_items (15 records)');

    // ── Create & Seed Documents (15) ──────────────────────────────
    await pool.query(`
      CREATE TABLE documents (
        id SERIAL PRIMARY KEY,
        document_number VARCHAR(50) UNIQUE,
        title VARCHAR(300),
        document_type VARCHAR(100),
        category VARCHAR(100),
        revision VARCHAR(20) DEFAULT 'Rev A',
        effective_date DATE,
        expiry_date DATE,
        aircraft_type VARCHAR(100),
        ata_chapter VARCHAR(20),
        author VARCHAR(100),
        approved_by VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Active',
        description TEXT,
        file_reference VARCHAR(300),
        distribution_list TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created table: documents');

    await pool.query(`
      INSERT INTO documents (document_number, title, document_type, category, revision, effective_date, expiry_date, aircraft_type, ata_chapter, author, approved_by, status, description, file_reference, distribution_list) VALUES
        ('DOC-ENG-001', 'CFM56-7B Engine Removal and Installation', 'Engineering Order', 'Engine', 'Rev D', '2025-06-15', '2027-06-15', 'Boeing 737-800', '72', 'James Wright', 'VP Engineering', 'Active', 'Step-by-step procedure for CFM56-7B engine removal, stand mounting, and reinstallation with torque values.', '/docs/eng/CFM56-removal-revD.pdf', 'Engine Shop, Hangar Leads, QA'),
        ('DOC-QA-002', 'Quality Assurance Manual', 'Manual', 'Quality', 'Rev G', '2024-01-01', '2026-12-31', 'All Types', 'N/A', 'Quality Director', 'GM Operations', 'Active', 'Master QA manual covering inspection standards, buy-back procedures, and RII requirements.', '/docs/qa/QA-Manual-RevG.pdf', 'All Departments'),
        ('DOC-SB-003', 'Service Bulletin - A320 Pylon Modification', 'Service Bulletin', 'Structural', 'Rev B', '2025-09-01', '2026-09-01', 'Airbus A320neo', '54', 'Airbus Engineering', 'Chief Inspector', 'Active', 'Mandatory pylon attach fitting modification to address fatigue cracking per AD-2025-08-05.', '/docs/sb/A320-SB54-3012-RevB.pdf', 'Structures, Planning, QA'),
        ('DOC-TRAIN-004', 'B787 Type Rating Training Syllabus', 'Training', 'Human Resources', 'Rev C', '2025-03-01', '2027-03-01', 'Boeing 787-9', 'N/A', 'Training Manager', 'Director HR', 'Active', 'Complete training syllabus for B787 type rating including CBT, simulator, and OJT requirements.', '/docs/training/B787-Type-Rating-RevC.pdf', 'Training Dept, Avionics, Powerplant'),
        ('DOC-INSP-005', 'NDT Procedures - Ultrasonic Inspection', 'Procedure', 'NDT', 'Rev E', '2024-11-01', '2026-11-01', 'All Types', '51', 'NDT Level III', 'QA Manager', 'Active', 'Standard procedures for ultrasonic inspection of metallic structures including calibration and reporting.', '/docs/ndt/UT-Procedures-RevE.pdf', 'NDT Lab, QA, Structures'),
        ('DOC-MAINT-006', 'Line Maintenance Operations Manual', 'Manual', 'Maintenance', 'Rev F', '2025-01-15', '2027-01-15', 'All Types', 'N/A', 'Line Maint Manager', 'VP Maintenance', 'Active', 'Comprehensive line maintenance manual covering transit checks, daily inspections, and MEL procedures.', '/docs/maint/Line-Maint-Manual-RevF.pdf', 'Line Maintenance, Dispatch, QA'),
        ('DOC-SAFETY-007', 'SMS Safety Management Manual', 'Manual', 'Safety', 'Rev D', '2025-04-01', '2027-04-01', 'All Types', 'N/A', 'Safety Director', 'Accountable Manager', 'Active', 'Safety management system manual per ICAO Annex 19 and FAR Part 5 requirements.', '/docs/safety/SMS-Manual-RevD.pdf', 'All Departments'),
        ('DOC-AD-008', 'Airworthiness Directive Compliance Record', 'Compliance', 'Regulatory', 'Rev A', '2026-01-01', '2026-12-31', 'All Types', 'N/A', 'Records Dept', 'Chief Inspector', 'Active', 'Master tracking document for all applicable AD compliance status across the fleet.', '/docs/compliance/AD-Compliance-2026.pdf', 'Planning, Records, QA'),
        ('DOC-PROC-009', 'Hazardous Materials Handling Procedure', 'Procedure', 'Safety', 'Rev C', '2025-07-01', '2027-07-01', 'All Types', 'N/A', 'HSE Manager', 'Safety Director', 'Active', 'Procedures for handling, storage, and disposal of hazardous materials including Skydrol, MEK, and sealants.', '/docs/safety/HazMat-Procedure-RevC.pdf', 'All Shops, HSE, Stores'),
        ('DOC-TOOL-010', 'Calibrated Tool Control Program', 'Program', 'Quality', 'Rev B', '2025-05-01', '2027-05-01', 'All Types', 'N/A', 'Tool Control Manager', 'QA Manager', 'Active', 'Tool calibration tracking, recall procedures, and out-of-tolerance impact assessments.', '/docs/qa/Tool-Control-RevB.pdf', 'Tool Crib, All Shops, QA'),
        ('DOC-EO-011', 'Engineering Order - Landing Gear Bushing', 'Engineering Order', 'Landing Gear', 'Rev A', '2026-02-01', '2026-08-01', 'Boeing 777-300ER', '32', 'LG Engineer', 'VP Engineering', 'Active', 'Replacement of main landing gear trunnion bushings with improved wear-resistant material.', '/docs/eng/B777-LG-Bushing-EO.pdf', 'Landing Gear Shop, Planning, QA'),
        ('DOC-CMM-012', 'Component Maintenance Manual - APU', 'Manual', 'Engine', 'Rev H', '2024-09-01', '2026-09-01', 'All Types', '49', 'Honeywell Technical', 'Engineering Manager', 'Active', 'Overhaul and repair manual for Honeywell 131-9A APU including test cell run procedures.', '/docs/cmm/APU-131-9A-CMM-RevH.pdf', 'APU Shop, Engine Shop, QA'),
        ('DOC-WI-013', 'Work Instruction - Composite Repair', 'Work Instruction', 'Structural', 'Rev C', '2025-08-15', '2027-08-15', 'All Types', '51', 'Composites Lead', 'Structures Manager', 'Active', 'Detailed work instructions for bonded composite repairs including surface prep, layup, and cure cycles.', '/docs/wi/Composite-Repair-WI-RevC.pdf', 'Composites Shop, Structures, QA'),
        ('DOC-SPEC-014', 'Paint Specification - Exterior Scheme', 'Specification', 'Finishing', 'Rev B', '2025-10-01', '2026-10-01', 'All Types', '51', 'Paint Shop Lead', 'VP Maintenance', 'Expired', 'Exterior paint specification including primer, topcoat, and livery application standards.', '/docs/spec/Paint-Spec-RevB.pdf', 'Paint Shop, Planning'),
        ('DOC-REP-015', 'Repair Station Operations Specifications', 'Regulatory', 'Quality', 'Rev E', '2025-01-01', '2027-01-01', 'All Types', 'N/A', 'Accountable Manager', 'FAA FSDO', 'Active', 'FAA-approved repair station operations specifications listing all authorized ratings and limitations.', '/docs/regulatory/OpSpecs-RevE.pdf', 'All Departments, FAA');
    `);
    console.log('Seeded: documents (15 records)');

    // ── Create & Seed Purchase Orders (15) ────────────────────────
    await pool.query(`
      CREATE TABLE purchase_orders (
        id SERIAL PRIMARY KEY,
        po_number VARCHAR(50) UNIQUE,
        vendor_name VARCHAR(200),
        vendor_code VARCHAR(20),
        order_date DATE,
        expected_delivery DATE,
        actual_delivery DATE,
        status VARCHAR(50) DEFAULT 'Draft',
        priority VARCHAR(20) DEFAULT 'Medium',
        total_amount DECIMAL(14,2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'USD',
        items_description TEXT,
        quantity INTEGER DEFAULT 1,
        unit_price DECIMAL(12,2),
        requested_by VARCHAR(100),
        approved_by VARCHAR(100),
        aircraft_reg VARCHAR(20),
        department VARCHAR(100),
        payment_status VARCHAR(50) DEFAULT 'Pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created table: purchase_orders');

    await pool.query(`
      INSERT INTO purchase_orders (po_number, vendor_name, vendor_code, order_date, expected_delivery, actual_delivery, status, priority, total_amount, currency, items_description, quantity, unit_price, requested_by, approved_by, aircraft_reg, department, payment_status, notes) VALUES
        ('PO-2026-001', 'Honeywell Aerospace', 'VND-001', '2026-03-01', '2026-03-20', NULL, 'Ordered', 'High', 45000.00, 'USD', 'APU Starter Motor Assembly P/N 3800657-3', 1, 45000.00, 'Dave Wilson', 'John Davis', 'N78501', 'Engine Shop', 'Pending', 'Urgent requirement for AOG aircraft'),
        ('PO-2026-002', 'Parker Aerospace', 'VND-003', '2026-02-15', '2026-03-15', '2026-03-12', 'Delivered', 'Medium', 18500.00, 'USD', 'Hydraulic Actuator Seals Kit - Main Landing Gear', 5, 3700.00, 'Tom Anderson', 'Maria Lopez', 'N55678', 'Landing Gear Shop', 'Paid', 'Received ahead of schedule'),
        ('PO-2026-003', 'Aviall Services', 'VND-014', '2026-03-10', '2026-03-25', NULL, 'Ordered', 'Critical', 125000.00, 'USD', 'CFM56-7B Turbine Blade Set (Stage 1 HPT)', 1, 125000.00, 'James Wright', 'VP Engineering', 'N78501', 'Engine Shop', 'Pending', 'Required for engine overhaul WO-2026-003'),
        ('PO-2026-004', 'Heico Corporation', 'VND-012', '2026-03-05', '2026-03-18', NULL, 'In Transit', 'Medium', 8200.00, 'USD', 'PMA Brake Assembly Components', 4, 2050.00, 'Mike Chen', 'Maria Lopez', 'N88345', 'Landing Gear Shop', 'Pending', 'FAA-PMA approved alternative parts'),
        ('PO-2026-005', 'Collins Aerospace', 'VND-002', '2026-01-20', '2026-02-28', '2026-03-05', 'Delivered', 'High', 67500.00, 'USD', 'Weather Radar Antenna Assembly RT-1500', 1, 67500.00, 'Sarah Kim', 'John Davis', 'N90832', 'Avionics Shop', 'Paid', 'Late delivery - vendor notified of penalty'),
        ('PO-2026-006', 'MTU Aero Engines', 'VND-015', '2026-03-12', '2026-04-30', NULL, 'Approved', 'High', 285000.00, 'USD', 'LPT Module Overhaul Service - GEnx-1B', 1, 285000.00, 'VP Engineering', 'GM Operations', 'N90832', 'Engine Shop', 'Pending', 'Module shipped to MTU Munich facility'),
        ('PO-2026-007', 'SPS Technologies', 'VND-011', '2026-03-08', '2026-03-15', '2026-03-14', 'Delivered', 'Low', 2350.00, 'USD', 'AN/MS Hardware Assortment - Hi-Lok Fasteners', 500, 4.70, 'Alex Martinez', 'Maria Lopez', NULL, 'Stores', 'Paid', 'Stock replenishment order'),
        ('PO-2026-008', 'Safran Landing Systems', 'VND-004', '2026-02-28', '2026-04-15', NULL, 'Ordered', 'Critical', 195000.00, 'USD', 'Main Landing Gear Shock Strut Assembly', 1, 195000.00, 'Dave Wilson', 'VP Engineering', 'N33190', 'Landing Gear Shop', 'Pending', 'For D-Check requirements'),
        ('PO-2026-009', 'Michelin Aircraft Tire', 'VND-008', '2026-03-14', '2026-03-22', NULL, 'Ordered', 'Medium', 14400.00, 'USD', 'Main Wheel Tires - Air X Radial', 8, 1800.00, 'Tom Anderson', 'Maria Lopez', 'N55678', 'Landing Gear Shop', 'Pending', 'Scheduled tire replacement'),
        ('PO-2026-010', 'GE Aviation Materials', 'VND-007', '2026-03-01', '2026-04-01', NULL, 'In Transit', 'High', 52000.00, 'USD', 'Fan Blade Repair Kit - GE90-115B', 1, 52000.00, 'James Wright', 'John Davis', 'N55678', 'Engine Shop', 'Pending', 'Expedited shipping requested'),
        ('PO-2026-011', 'Northrop Grumman', 'VND-010', '2026-02-01', '2026-03-30', NULL, 'Ordered', 'Medium', 34500.00, 'USD', 'IRU Inertial Reference Unit - LN-100G', 1, 34500.00, 'Sarah Kim', 'John Davis', 'N44215', 'Avionics Shop', 'Pending', 'Replacement for failed unit'),
        ('PO-2026-012', 'B/E Aerospace', 'VND-009', '2026-03-15', '2026-04-10', NULL, 'Draft', 'Low', 24000.00, 'USD', 'Cabin Oxygen Generator Assemblies', 12, 2000.00, 'Chris Brown', NULL, 'N81234', 'Cabin', 'Pending', 'Awaiting management approval'),
        ('PO-2026-013', 'Lufthansa Technik', 'VND-006', '2026-01-15', '2026-03-15', '2026-03-18', 'Delivered', 'High', 156000.00, 'USD', 'V2500 Engine QEC Build-Up Service', 1, 156000.00, 'VP Engineering', 'GM Operations', 'N44215', 'Engine Shop', 'Invoiced', 'Engine returned with updated LLP records'),
        ('PO-2026-014', 'ST Engineering', 'VND-013', '2026-03-18', '2026-03-28', NULL, 'Approved', 'Medium', 8900.00, 'USD', 'Composite Repair Materials Kit - Prepreg/Film Adhesive', 2, 4450.00, 'Robert Taylor', 'Maria Lopez', 'N40567', 'Structures', 'Pending', 'For lightning strike repair'),
        ('PO-2026-015', 'Pratt & Whitney', 'VND-005', '2026-03-16', '2026-05-15', NULL, 'Ordered', 'Critical', 320000.00, 'USD', 'PW4000-112 Hot Section Inspection Service', 1, 320000.00, 'VP Engineering', 'GM Operations', 'N33190', 'Engine Shop', 'Pending', 'Part of D-Check engine program');
    `);
    console.log('Seeded: purchase_orders (15 records)');

    // ── Create & Seed Audit Log (15) ──────────────────────────────
    await pool.query(`
      CREATE TABLE audit_log (
        id SERIAL PRIMARY KEY,
        log_number VARCHAR(50) UNIQUE,
        action_type VARCHAR(50),
        module VARCHAR(100),
        record_id INTEGER,
        record_reference VARCHAR(100),
        description TEXT,
        performed_by VARCHAR(100),
        user_role VARCHAR(50),
        ip_address VARCHAR(50),
        old_value TEXT,
        new_value TEXT,
        severity VARCHAR(20) DEFAULT 'Info',
        status VARCHAR(50) DEFAULT 'Logged',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created table: audit_log');

    await pool.query(`
      INSERT INTO audit_log (log_number, action_type, module, record_id, record_reference, description, performed_by, user_role, ip_address, old_value, new_value, severity, status) VALUES
        ('LOG-2026-001', 'CREATE', 'Work Orders', 1, 'WO-2026-001', 'New work order created for B737 A-Check maintenance', 'Admin User', 'admin', '192.168.1.100', NULL, 'Status: Open, Priority: High', 'Info', 'Logged'),
        ('LOG-2026-002', 'UPDATE', 'Aircraft Maintenance', 2, 'N44215', 'Maintenance status changed from Scheduled to In Progress', 'Operations Manager', 'manager', '192.168.1.101', 'Status: Scheduled', 'Status: In Progress', 'Info', 'Logged'),
        ('LOG-2026-003', 'DELETE', 'Inventory', 99, 'OBS-FILTER-22', 'Obsolete inventory item removed from stock', 'Admin User', 'admin', '192.168.1.100', 'Qty: 0, Status: Obsolete', NULL, 'Warning', 'Logged'),
        ('LOG-2026-004', 'UPDATE', 'Compliance', 5, 'AD-2024-05-18', 'Compliance status updated to Completed with documentation', 'Lead Technician', 'technician', '192.168.1.102', 'Status: In Progress', 'Status: Completed', 'Info', 'Logged'),
        ('LOG-2026-005', 'CREATE', 'Safety Incidents', 8, 'INC-2024-008', 'New safety incident reported - runway FOD event', 'Operations Manager', 'manager', '192.168.1.101', NULL, 'Severity: Major, Category: FOD', 'Critical', 'Logged'),
        ('LOG-2026-006', 'UPDATE', 'Fleet Health', 3, 'N90832', 'Health score reduced due to engine oil consumption trend', 'Lead Technician', 'technician', '192.168.1.102', 'Health Score: 82', 'Health Score: 68', 'Warning', 'Logged'),
        ('LOG-2026-007', 'LOGIN', 'Authentication', 1, 'admin@aeromro.com', 'User logged in successfully', 'Admin User', 'admin', '192.168.1.100', NULL, 'Session started', 'Info', 'Logged'),
        ('LOG-2026-008', 'UPDATE', 'Technicians', 5, 'EMP-005', 'Technician license renewed - new expiry date updated', 'Admin User', 'admin', '192.168.1.100', 'License Expiry: 2026-03-15', 'License Expiry: 2028-03-15', 'Info', 'Logged'),
        ('LOG-2026-009', 'CREATE', 'Purchase Orders', 3, 'PO-2026-003', 'Critical PO created for turbine blade set - AOG priority', 'Operations Manager', 'manager', '192.168.1.101', NULL, 'Amount: $125,000, Vendor: Aviall', 'Critical', 'Logged'),
        ('LOG-2026-010', 'UPDATE', 'MEL Tracking', 9, 'MEL-2026-009', 'MEL item rectified and closed', 'Lead Technician', 'technician', '192.168.1.102', 'Status: Active', 'Status: Rectified', 'Info', 'Logged'),
        ('LOG-2026-011', 'EXPORT', 'Compliance', 0, 'Monthly Report', 'FAA compliance report exported for March 2026', 'Admin User', 'admin', '192.168.1.100', NULL, 'Format: PDF, Records: 15', 'Info', 'Logged'),
        ('LOG-2026-012', 'UPDATE', 'Tool Calibration', 6, 'TL-006', 'Tool marked as overdue - removed from service', 'Operations Manager', 'manager', '192.168.1.101', 'Status: Due', 'Status: Overdue', 'Warning', 'Logged'),
        ('LOG-2026-013', 'CREATE', 'Documents', 11, 'DOC-EO-011', 'New engineering order published for LG bushing replacement', 'Admin User', 'admin', '192.168.1.100', NULL, 'Type: Engineering Order, Rev A', 'Info', 'Logged'),
        ('LOG-2026-014', 'APPROVE', 'Purchase Orders', 6, 'PO-2026-006', 'High-value PO approved by General Manager', 'GM Operations', 'admin', '192.168.1.99', 'Status: Pending Approval', 'Status: Approved', 'Info', 'Logged'),
        ('LOG-2026-015', 'UPDATE', 'Vendors', 8, 'VND-008', 'Vendor rating updated after quarterly performance review', 'Operations Manager', 'manager', '192.168.1.101', 'Rating: 4.20', 'Rating: 4.40', 'Info', 'Logged');
    `);
    console.log('Seeded: audit_log (15 records)');

    // ── Seed Shift Scheduling (10) ────────────────────────────────
    await pool.query(`
      INSERT INTO shift_scheduling (shift_code, technician_name, employee_id, shift_type, shift_date, start_time, end_time, hangar_location, aircraft_reg, task_description, status, notes) VALUES
        ('SH-001', 'James Wilson', 'EMP-001', 'Day', '2026-03-21', '06:00', '14:00', 'Hangar A', 'N12345', 'A-Check inspection on Boeing 737-800', 'Scheduled', 'Bring torque wrench set'),
        ('SH-002', 'Sarah Martinez', 'EMP-002', 'Night', '2026-03-21', '22:00', '06:00', 'Hangar B', 'N67890', 'Engine borescope inspection CFM56', 'In Progress', NULL),
        ('SH-003', 'Mike Thompson', 'EMP-003', 'Day', '2026-03-21', '06:00', '14:00', 'Hangar A', 'N12345', 'Landing gear overhaul support', 'Scheduled', NULL),
        ('SH-004', 'Lisa Chen', 'EMP-004', 'Swing', '2026-03-21', '14:00', '22:00', 'Hangar C', 'N24680', 'Avionics upgrade - FMS installation', 'Scheduled', 'Requires avionics bay access'),
        ('SH-005', 'Robert Davis', 'EMP-005', 'Day', '2026-03-22', '06:00', '14:00', 'Hangar B', 'N67890', 'Engine change #2 - CFM LEAP-1B', 'Scheduled', 'Heavy lift crane reserved'),
        ('SH-006', 'James Wilson', 'EMP-001', 'Night', '2026-03-22', '22:00', '06:00', 'Hangar A', 'N13579', 'C-Check structural inspection', 'Scheduled', NULL),
        ('SH-007', 'Sarah Martinez', 'EMP-002', 'Day', '2026-03-20', '06:00', '14:00', 'Hangar B', 'N67890', 'Engine run-up after maintenance', 'Completed', 'All parameters normal'),
        ('SH-008', 'Mike Thompson', 'EMP-003', 'Swing', '2026-03-20', '14:00', '22:00', 'Hangar C', 'N24680', 'Cabin interior refurbishment', 'Completed', NULL),
        ('SH-009', 'Lisa Chen', 'EMP-004', 'Day', '2026-03-19', '06:00', '14:00', 'Hangar A', 'N12345', 'NDT inspection - wing spar', 'Completed', 'No defects found'),
        ('SH-010', 'Robert Davis', 'EMP-005', 'Night', '2026-03-23', '22:00', '06:00', 'Hangar B', 'N67890', 'APU replacement', 'Scheduled', 'APU received from vendor');
    `);
    console.log('Seeded: shift_scheduling (10 records)');

    // ── Seed Hangar Management (6) ────────────────────────────────
    await pool.query(`
      INSERT INTO hangar_management (hangar_code, hangar_name, location, capacity, current_occupancy, aircraft_reg, hangar_type, status, equipment_available, contact_person, phone, daily_rate, notes) VALUES
        ('HGR-A', 'Hangar Alpha', 'Main Campus - North', 3, 2, 'N12345', 'Wide Body', 'Occupied', 'Overhead crane (50T), Docking system, Paint booth', 'John Baker', '+1-555-0201', 15000.00, 'Primary heavy maintenance hangar'),
        ('HGR-B', 'Hangar Bravo', 'Main Campus - South', 4, 3, 'N67890', 'Wide Body', 'Occupied', 'Engine stand, Overhead crane (30T), NDT equipment', 'Maria Santos', '+1-555-0202', 12000.00, 'Engine shop adjacent'),
        ('HGR-C', 'Hangar Charlie', 'Main Campus - East', 2, 1, 'N24680', 'Narrow Body', 'Occupied', 'Avionics test bench, Component rack', 'David Park', '+1-555-0203', 8000.00, 'Avionics specialization'),
        ('HGR-D', 'Hangar Delta', 'Satellite Facility', 2, 0, NULL, 'Narrow Body', 'Available', 'Basic tooling, Jack set, Tow bar', 'Susan Lee', '+1-555-0204', 6000.00, 'Line maintenance capable'),
        ('HGR-E', 'Hangar Echo', 'Main Campus - West', 1, 0, NULL, 'Regional', 'Under Maintenance', 'Floor being resurfaced', 'Tom Wright', '+1-555-0205', 4000.00, 'Roof repair in progress - ETA 2 weeks'),
        ('HGR-F', 'Hangar Foxtrot', 'Satellite Facility', 6, 4, 'N13579', 'Wide Body', 'Occupied', 'Full docking, Paint booth, Composite repair', 'Karen Mitchell', '+1-555-0206', 20000.00, 'Largest hangar - heavy checks');
    `);
    console.log('Seeded: hangar_management (6 records)');

    // ── Seed Training Records (12) ────────────────────────────────
    await pool.query(`
      INSERT INTO training_records (record_number, employee_id, technician_name, training_type, course_name, provider, start_date, completion_date, expiry_date, score, pass_fail, certificate_number, status, notes) VALUES
        ('TR-001', 'EMP-001', 'James Wilson', 'Type Rating', 'Boeing 737 NG Type Rating', 'Boeing Training Center', '2025-06-01', '2025-06-15', '2027-06-15', 94.50, 'Pass', 'CERT-B737-0451', 'Completed', NULL),
        ('TR-002', 'EMP-001', 'James Wilson', 'Safety', 'Human Factors & CRM', 'AeroSafety Institute', '2025-09-10', '2025-09-11', '2026-09-11', 88.00, 'Pass', 'CERT-HF-1122', 'Completed', NULL),
        ('TR-003', 'EMP-002', 'Sarah Martinez', 'Type Rating', 'CFM56 Engine Familiarization', 'CFM International', '2025-03-15', '2025-03-28', '2027-03-28', 97.00, 'Pass', 'CERT-CFM56-0782', 'Completed', 'Top of class'),
        ('TR-004', 'EMP-002', 'Sarah Martinez', 'Recurrent', 'EWIS Recurrent Training', 'In-House', '2026-01-10', '2026-01-12', '2027-01-12', 91.00, 'Pass', 'CERT-EWIS-2201', 'Completed', NULL),
        ('TR-005', 'EMP-003', 'Mike Thompson', 'Regulatory', 'FAA Part 145 Regulations Update', 'FAA Academy', '2026-02-01', '2026-02-03', '2026-05-03', 85.00, 'Pass', 'CERT-REG-3301', 'Completed', 'Expires soon - schedule renewal'),
        ('TR-006', 'EMP-003', 'Mike Thompson', 'Type Rating', 'Airbus A320 Family Type Rating', 'Airbus Training', '2026-03-01', '2026-03-14', '2028-03-14', 92.50, 'Pass', 'CERT-A320-0553', 'Completed', NULL),
        ('TR-007', 'EMP-004', 'Lisa Chen', 'Initial', 'Composite Repair Fundamentals', 'Abaris Training', '2026-02-15', '2026-02-28', '2028-02-28', 96.00, 'Pass', 'CERT-COMP-4401', 'Completed', NULL),
        ('TR-008', 'EMP-004', 'Lisa Chen', 'Recurrent', 'NDT Level II Recurrent', 'ASNT Certified Provider', '2026-04-01', NULL, '2027-04-01', NULL, 'Pending', NULL, 'Scheduled', 'Registered for April session'),
        ('TR-009', 'EMP-005', 'Robert Davis', 'Safety', 'Dangerous Goods Handling', 'IATA Training', '2025-11-05', '2025-11-07', '2026-05-07', 79.00, 'Pass', 'CERT-DG-5501', 'Completed', 'Renewal needed by May'),
        ('TR-010', 'EMP-005', 'Robert Davis', 'OJT', 'On-the-Job: B787 Systems', 'In-House', '2026-03-10', NULL, NULL, NULL, 'Pending', NULL, 'In Progress', '40 hours required, 12 completed'),
        ('TR-011', 'EMP-001', 'James Wilson', 'Recurrent', 'Fuel Tank Safety (CDCCL)', 'Boeing Training Center', '2024-12-01', '2024-12-03', '2025-12-03', 90.00, 'Pass', 'CERT-FTS-6601', 'Expired', 'OVERDUE - schedule immediately'),
        ('TR-012', 'EMP-003', 'Mike Thompson', 'Safety', 'Fall Protection & Confined Space', 'SafetyFirst Corp', '2026-05-15', NULL, '2028-05-15', NULL, 'Pending', NULL, 'Scheduled', 'Annual safety requirement');
    `);
    console.log('Seeded: training_records (12 records)');

    // ── Seed Customers (8) ────────────────────────────────────────
    await pool.query(`
      INSERT INTO customers (customer_code, company_name, contact_name, email, phone, address, city, country, customer_type, fleet_size, contract_start, contract_end, account_manager, credit_limit, total_revenue, total_work_orders, status, notes) VALUES
        ('CUS-001', 'SkyWest Airlines', 'Patricia Morgan', 'pmorgan@skywest.com', '+1-555-1001', '444 Sky Harbor Blvd', 'St. George', 'USA', 'Airline', 245, '2024-01-01', '2027-12-31', 'David Reynolds', 5000000.00, 2450000.00, 48, 'Active', 'Preferred customer - quarterly reviews'),
        ('CUS-002', 'Atlas Air Cargo', 'Robert Kim', 'rkim@atlasair.com', '+1-555-1002', '2000 Westchester Ave', 'Purchase', 'USA', 'Cargo', 58, '2025-03-01', '2028-02-28', 'Sarah Mitchell', 8000000.00, 3200000.00, 32, 'Active', 'Heavy freighter maintenance contract'),
        ('CUS-003', 'NetJets Executive', 'Jennifer Walsh', 'jwalsh@netjets.com', '+1-555-1003', '4111 Bridgeway Ave', 'Columbus', 'USA', 'Charter', 120, '2025-06-15', '2026-06-14', 'David Reynolds', 2000000.00, 890000.00, 65, 'Active', 'High volume - quick turnaround required'),
        ('CUS-004', 'USAF 89th Airlift Wing', 'Col. James Hart', 'james.hart@us.af.mil', '+1-555-1004', 'Joint Base Andrews', 'Camp Springs', 'USA', 'Military', 12, '2025-01-01', '2029-12-31', 'Michael Torres', 15000000.00, 4100000.00, 18, 'Active', 'Security clearance required - ITAR controlled'),
        ('CUS-005', 'Caribbean Sun Airways', 'Carlos Mendez', 'cmendez@caribsun.com', '+1-555-1005', '100 Airport Rd', 'San Juan', 'Puerto Rico', 'Airline', 15, '2026-01-01', '2026-12-31', 'Sarah Mitchell', 500000.00, 125000.00, 5, 'Active', 'New customer - trial year contract'),
        ('CUS-006', 'GlobalReach Aviation', 'Amanda Foster', 'afoster@globalreach.com', '+44-20-555-1006', '12 Heathrow Blvd', 'London', 'UK', 'Charter', 34, '2025-09-01', '2027-08-31', 'David Reynolds', 3000000.00, 1560000.00, 22, 'Active', 'International account - EUR billing'),
        ('CUS-007', 'Horizon Regional Air', 'Thomas Black', 'tblack@horizonair.com', '+1-555-1007', '200 Terminal Dr', 'Portland', 'USA', 'Airline', 42, NULL, NULL, 'Michael Torres', 0.00, 0.00, 0, 'Prospect', 'Met at MRO Americas conference - follow up Q2'),
        ('CUS-008', 'Pacific Freight Lines', 'Kevin Tanaka', 'ktanaka@pacfreight.com', '+1-555-1008', '500 Harbor Blvd', 'Long Beach', 'USA', 'Cargo', 28, '2024-06-01', '2025-05-31', 'Sarah Mitchell', 1000000.00, 780000.00, 14, 'Inactive', 'Contract expired - renewal negotiations in progress');
    `);
    console.log('Seeded: customers (8 records)');

    // ── Seed Warranty Tracking (10) ───────────────────────────────
    await pool.query(`
      INSERT INTO warranty_tracking (warranty_number, part_number, part_name, serial_number, vendor_name, purchase_date, warranty_start, expiry_date, warranty_type, coverage_details, claim_status, claim_amount, claim_date, claim_description, status, aircraft_reg, notes) VALUES
        ('WR-001', 'CFM56-5B4/3', 'CFM56 Engine Assembly', 'ESN-789456', 'CFM International', '2024-06-15', '2024-06-15', '2029-06-15', 'Full', 'Full engine warranty covering all components, labor, and materials for 5 years or 10,000 cycles', 'No Claim', 0, NULL, NULL, 'Active', 'N67890', NULL),
        ('WR-002', 'PN-7890-APU', 'APS 3200 APU', 'APU-SN-123', 'Honeywell Aerospace', '2025-01-10', '2025-01-10', '2028-01-10', 'Full', 'Full warranty on APU including hot section', 'Pending', 45000.00, '2026-02-15', 'Abnormal vibration detected during ground run - possible turbine blade issue', 'Active', 'N12345', 'Claim submitted - awaiting Honeywell response'),
        ('WR-003', 'PN-4455-LG', 'Main Landing Gear Assembly', 'MLG-SN-567', 'Safran Landing Systems', '2023-08-20', '2023-08-20', '2026-08-20', 'Limited', 'Structural components only - excludes wear items (brakes, tires, seals)', 'Approved', 28500.00, '2025-11-01', 'Actuator cylinder crack found during overhaul inspection', 'Active', 'N24680', 'Claim approved - replacement part shipped'),
        ('WR-004', 'PN-1122-AV', 'FMS Navigation Computer', 'FMS-SN-890', 'Collins Aerospace', '2025-07-01', '2025-07-01', '2027-07-01', 'Limited', 'Hardware warranty only - software updates excluded', 'No Claim', 0, NULL, NULL, 'Active', 'N13579', NULL),
        ('WR-005', 'PN-3344-HYD', 'Hydraulic Power Pack', 'HYD-SN-234', 'Parker Hannifin', '2024-03-10', '2024-03-10', '2026-03-10', 'Extended', 'Extended warranty covering pump, motor, and reservoir for 2 years', 'Denied', 12000.00, '2026-01-20', 'Seal failure in pump assembly - vendor claims improper fluid used', 'Expired', 'N67890', 'Warranty expired - disputed claim denied'),
        ('WR-006', 'PN-5566-ENG', 'LEAP-1B Engine', 'ESN-112233', 'CFM International', '2025-09-01', '2025-09-01', '2030-09-01', 'Full', 'Full engine warranty - 5 years unlimited cycles', 'No Claim', 0, NULL, NULL, 'Active', 'N12345', 'New engine installation'),
        ('WR-007', 'PN-7788-WHL', 'Nose Wheel Assembly', 'NW-SN-445', 'Meggitt Aircraft Braking', '2025-04-15', '2025-04-15', '2026-04-15', 'Prorated', 'Prorated warranty - decreasing coverage over 12 months', 'In Review', 3200.00, '2026-03-01', 'Bearing failure after 800 cycles - within expected life', 'Active', 'N24680', 'Under vendor review - response due April 1'),
        ('WR-008', 'PN-9900-OXY', 'Passenger Oxygen Generator', 'OXY-SN-678', 'B/E Aerospace', '2024-11-01', '2024-11-01', '2026-11-01', 'Limited', 'Chemical generator warranty - excludes activation mechanism', 'No Claim', 0, NULL, NULL, 'Active', 'N13579', NULL),
        ('WR-009', 'PN-2233-RAD', 'Weather Radar Antenna', 'RAD-SN-901', 'Honeywell Aerospace', '2023-05-20', '2023-05-20', '2025-05-20', 'Full', 'Full warranty on radar antenna and pedestal', 'Approved', 18500.00, '2025-03-15', 'Antenna pedestal motor failure', 'Claimed', 'N67890', 'Replacement received and installed'),
        ('WR-010', 'PN-4466-SEAT', 'Business Class Seat Actuator', 'SEAT-SN-112', 'Zodiac Aerospace', '2024-02-01', '2024-02-01', '2025-02-01', 'Limited', 'Actuator motor warranty - 12 months', 'No Claim', 0, NULL, NULL, 'Expired', 'N12345', 'Warranty expired - no issues during coverage period');
    `);
    console.log('Seeded: warranty_tracking (10 records)');

    console.log('\n========================================');
    console.log('Database seeded successfully!');
    console.log('========================================\n');

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error seeding database:', err.message);
    console.error(err.stack);
    await pool.end();
    process.exit(1);
  }
}

seed();

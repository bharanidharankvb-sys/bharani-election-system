import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase if keys exist, otherwise fallback to high-fidelity local database
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

// Initial Local In-Memory / File Persistent Mock Storage with Realistic Seed Data
const initialStore = {
  users: [
    {
      id: "usr-001",
      name: "Alex Rivera",
      register_number: "2024CS101",
      department: "Computer Science",
      year: "3rd Year",
      email: "alex.rivera@college.edu",
      role: "student",
      is_blocked: false,
      created_at: new Date(Date.now() - 86400000 * 30).toISOString()
    },
    {
      id: "usr-002",
      name: "Sophia Chen",
      register_number: "2024EC204",
      department: "Electronics & Comm",
      year: "2nd Year",
      email: "sophia.chen@college.edu",
      role: "student",
      is_blocked: false,
      created_at: new Date(Date.now() - 86400000 * 25).toISOString()
    },
    {
      id: "usr-003",
      name: "Marcus Vance",
      register_number: "2024ME309",
      department: "Mechanical Eng",
      year: "4th Year",
      email: "marcus.vance@college.edu",
      role: "student",
      is_blocked: false,
      created_at: new Date(Date.now() - 86400000 * 20).toISOString()
    },
    {
      id: "usr-004",
      name: "Emma Watson",
      register_number: "2024IT115",
      department: "Information Tech",
      year: "3rd Year",
      email: "emma.watson@college.edu",
      role: "student",
      is_blocked: false,
      created_at: new Date(Date.now() - 86400000 * 15).toISOString()
    },
    {
      id: "usr-005",
      name: "David Kim",
      register_number: "2024EE402",
      department: "Electrical Eng",
      year: "1st Year",
      email: "david.kim@college.edu",
      role: "student",
      is_blocked: false,
      created_at: new Date(Date.now() - 86400000 * 10).toISOString()
    }
  ],

  admins: [
    {
      id: "adm-001",
      name: "Dr. Robert Vance (Chief Election Officer)",
      email: "admin@college.edu",
      role: "super_admin"
    }
  ],

  elections: [
    {
      id: "elec-001",
      title: "Student Council General Election 2026",
      description: "Official annual election for Student Body President, Vice President, and General Secretary.",
      start_time: new Date(Date.now() - 3600000 * 4).toISOString(), // Started 4 hours ago
      end_time: new Date(Date.now() + 3600000 * 20).toISOString(), // Ends in 20 hours
      status: "active", // upcoming, active, paused, ended
      published: false,
      created_by: "admin@college.edu",
      created_at: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: "elec-002",
      title: "Department Sports Committee Election",
      description: "Selection of Sports Captain and Cultural Coordinator.",
      start_time: new Date(Date.now() + 86400000 * 3).toISOString(),
      end_time: new Date(Date.now() + 86400000 * 4).toISOString(),
      status: "upcoming",
      published: false,
      created_by: "admin@college.edu",
      created_at: new Date(Date.now() - 86400000 * 1).toISOString()
    }
  ],

  candidates: [
    {
      id: "cand-101",
      election_id: "elec-001",
      name: "Aarav Sharma",
      department: "Computer Science",
      year: "3rd Year",
      position: "President",
      photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400",
      manifesto: "Focusing on transparent student funding, upgraded Wi-Fi infrastructure, 24/7 library access, and expanded campus placement workshops.",
      vote_count: 142
    },
    {
      id: "cand-102",
      election_id: "elec-001",
      name: "Priya Patel",
      department: "Electronics & Comm",
      year: "3rd Year",
      position: "President",
      photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400",
      manifesto: "Empowering female leadership, eco-friendly green campus initiative, upgraded sports facilities, and fair hostel amenities.",
      vote_count: 118
    },
    {
      id: "cand-103",
      election_id: "elec-001",
      name: "Rohan Kapoor",
      department: "Information Tech",
      year: "3rd Year",
      position: "Vice President",
      photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400",
      manifesto: "Streamlined inter-department hackathons, student grievance app, and better cafeteria food standards.",
      vote_count: 156
    },
    {
      id: "cand-104",
      election_id: "elec-001",
      name: "Ananya Deshmukh",
      department: "Mechanical Eng",
      year: "2nd Year",
      position: "Vice President",
      photo: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=400",
      manifesto: "Advocating for hands-on lab equipment, technical fest sponsorships, and career mentorship programs.",
      vote_count: 98
    }
  ],

  votes: [
    {
      id: "vote-501",
      user_id: "usr-001",
      candidate_id: "cand-101",
      election_id: "elec-001",
      hash_code: "0x8f4b...3a12",
      timestamp: new Date(Date.now() - 3600000 * 3).toISOString()
    },
    {
      id: "vote-502",
      user_id: "usr-002",
      candidate_id: "cand-103",
      election_id: "elec-001",
      hash_code: "0x3e91...b7d8",
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
    }
  ],

  audit_logs: [
    {
      id: "log-1",
      user_name: "Dr. Robert Vance",
      action: "ELECTION_ACTIVATED",
      details: "Activated Student Council General Election 2026",
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString()
    },
    {
      id: "log-2",
      user_name: "Alex Rivera",
      action: "VOTE_CAST",
      details: "Cast vote for President in Student Council General Election 2026",
      timestamp: new Date(Date.now() - 3600000 * 3).toISOString()
    },
    {
      id: "log-3",
      user_name: "Sophia Chen",
      action: "VOTE_CAST",
      details: "Cast vote for Vice President in Student Council General Election 2026",
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
    }
  ]
};

// Memory store state
export const store = { ...initialStore };

export const logAuditAction = (userName, action, details) => {
  const log = {
    id: `log-${Date.now()}`,
    user_name: userName,
    action,
    details,
    timestamp: new Date().toISOString()
  };
  store.audit_logs.unshift(log);
  return log;
};

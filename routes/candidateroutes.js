import express from 'express';
import { store, logAuditAction } from '../db/store.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET CANDIDATES (Optionally filter by election_id)
router.get('/', (req, res) => {
  const { election_id } = req.query;
  if (election_id) {
    const candidates = store.candidates.filter(c => c.election_id === election_id);
    return res.json({ candidates });
  }
  res.json({ candidates: store.candidates });
});

// ADMIN: ADD CANDIDATE
router.post('/', verifyToken, requireAdmin, (req, res) => {
  try {
    const { name, department, year, position, photo, manifesto, election_id } = req.body;

    if (!name || !department || !year || !position || !manifesto || !election_id) {
      return res.status(400).json({ error: 'All fields (name, department, year, position, manifesto, election_id) are required.' });
    }

    const election = store.elections.find(e => e.id === election_id);
    if (!election) {
      return res.status(404).json({ error: 'Selected election does not exist.' });
    }

    const defaultPhoto = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400';

    const newCandidate = {
      id: `cand-${Date.now()}`,
      name,
      department,
      year,
      position,
      photo: photo || defaultPhoto,
      manifesto,
      election_id,
      vote_count: 0,
      created_at: new Date().toISOString()
    };

    store.candidates.push(newCandidate);

    logAuditAction(req.user.name, 'CANDIDATE_ADDED', `Added candidate ${name} for position ${position}`);

    res.status(201).json({
      message: 'Candidate added successfully.',
      candidate: newCandidate
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add candidate.' });
  }
});

// ADMIN: EDIT CANDIDATE
router.put('/:id', verifyToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const candidate = store.candidates.find(c => c.id === id);
  if (!candidate) {
    return res.status(404).json({ error: 'Candidate not found.' });
  }

  const { name, department, year, position, photo, manifesto } = req.body;

  if (name) candidate.name = name;
  if (department) candidate.department = department;
  if (year) candidate.year = year;
  if (position) candidate.position = position;
  if (photo) candidate.photo = photo;
  if (manifesto) candidate.manifesto = manifesto;

  logAuditAction(req.user.name, 'CANDIDATE_UPDATED', `Updated details for candidate: ${candidate.name}`);

  res.json({
    message: 'Candidate details updated.',
    candidate
  });
});

// ADMIN: DELETE CANDIDATE
router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const index = store.candidates.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Candidate not found.' });
  }

  const [deleted] = store.candidates.splice(index, 1);

  logAuditAction(req.user.name, 'CANDIDATE_DELETED', `Deleted candidate: ${deleted.name}`);

  res.json({ message: 'Candidate deleted successfully.' });
});

export default router;

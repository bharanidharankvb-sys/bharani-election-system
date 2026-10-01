import express from 'express';
import { store, logAuditAction } from '../db/store.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET ALL ELECTIONS
router.get('/', (req, res) => {
  const electionsWithDetails = store.elections.map(election => {
    const candidates = store.candidates.filter(c => c.election_id === election.id);
    const votes = store.votes.filter(v => v.election_id === election.id);
    return {
      ...election,
      candidate_count: candidates.length,
      total_votes_cast: votes.length
    };
  });
  res.json({ elections: electionsWithDetails });
});

// GET SINGLE ELECTION WITH CANDIDATES
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const election = store.elections.find(e => e.id === id);
  if (!election) {
    return res.status(404).json({ error: 'Election not found.' });
  }

  const candidates = store.candidates.filter(c => c.election_id === id);
  const votes = store.votes.filter(v => v.election_id === id);

  res.json({
    election,
    candidates,
    total_votes: votes.length
  });
});

// ADMIN: CREATE ELECTION
router.post('/', verifyToken, requireAdmin, (req, res) => {
  try {
    const { title, description, start_time, end_time } = req.body;

    if (!title || !start_time || !end_time) {
      return res.status(400).json({ error: 'Election title, start time, and end time are required.' });
    }

    const newElection = {
      id: `elec-${Date.now()}`,
      title,
      description: description || '',
      start_time: new Date(start_time).toISOString(),
      end_time: new Date(end_time).toISOString(),
      status: 'upcoming',
      published: false,
      created_by: req.user.email,
      created_at: new Date().toISOString()
    };

    store.elections.unshift(newElection);

    logAuditAction(req.user.name, 'ELECTION_CREATED', `Created election: ${title}`);

    res.status(201).json({
      message: 'Election created successfully.',
      election: newElection
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create election.' });
  }
});

// ADMIN: UPDATE STATUS (activate, pause, end, publish)
router.patch('/:id/status', verifyToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status, published } = req.body;

  const election = store.elections.find(e => e.id === id);
  if (!election) {
    return res.status(404).json({ error: 'Election not found.' });
  }

  if (status) {
    const validStatuses = ['upcoming', 'active', 'paused', 'ended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid election status provided.' });
    }
    election.status = status;
  }

  if (typeof published === 'boolean') {
    election.published = published;
  }

  logAuditAction(req.user.name, 'ELECTION_STATUS_CHANGED', `Election '${election.title}' set to ${status || (published ? 'published' : 'unpublished')}`);

  res.json({
    message: `Election status updated to ${election.status}.`,
    election
  });
});

// ADMIN: DELETE ELECTION
router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const index = store.elections.findIndex(e => e.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Election not found.' });
  }

  const [deleted] = store.elections.splice(index, 1);

  // Remove associated candidates and votes
  store.candidates = store.candidates.filter(c => c.election_id !== id);
  store.votes = store.votes.filter(v => v.election_id !== id);

  logAuditAction(req.user.name, 'ELECTION_DELETED', `Deleted election: ${deleted.title}`);

  res.json({ message: 'Election and related candidates successfully deleted.' });
});

export default router;

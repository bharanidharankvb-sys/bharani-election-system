import express from 'express';
import crypto from 'crypto';
import { store, logAuditAction } from '../db/store.js';
import { verifyToken, requireStudent } from '../middleware/auth.js';

const router = express.Router();

// CAST A VOTE
router.post('/cast', verifyToken, requireStudent, (req, res) => {
  try {
    const { election_id, candidate_id } = req.body;
    const userId = req.user.id;

    if (!election_id || !candidate_id) {
      return res.status(400).json({ error: 'Election ID and Candidate ID are required to cast vote.' });
    }

    // 1. Check Student Block Status
    const user = store.users.find(u => u.id === userId);
    if (user && user.is_blocked) {
      return res.status(403).json({ error: 'Voting denied. Your student account has been administrative locked.' });
    }

    // 2. Check Election Status & Validity
    const election = store.elections.find(e => e.id === election_id);
    if (!election) {
      return res.status(404).json({ error: 'Target election was not found.' });
    }

    if (election.status !== 'active') {
      return res.status(400).json({ error: `Voting is closed. Election status is currently '${election.status}'.` });
    }

    const now = new Date();
    const startTime = new Date(election.start_time);
    const endTime = new Date(election.end_time);

    if (now < startTime) {
      return res.status(400).json({ error: 'Voting has not opened for this election yet.' });
    }

    if (now > endTime) {
      return res.status(400).json({ error: 'Voting period has expired for this election.' });
    }

    // 3. Strict Single-Vote Validation per User per Election
    const existingVote = store.votes.find(v => v.user_id === userId && v.election_id === election_id);
    if (existingVote) {
      return res.status(409).json({ 
        error: 'Vote denied! You have already cast your vote in this election. Duplicate votes are strictly prohibited.',
        vote_receipt: existingVote
      });
    }

    // 4. Validate Candidate
    const candidate = store.candidates.find(c => c.id === candidate_id && c.election_id === election_id);
    if (!candidate) {
      return res.status(404).json({ error: 'Selected candidate does not exist in this election.' });
    }

    // 5. Generate Cryptographic Receipt Hash
    const hash = '0x' + crypto.createHash('sha256').update(`${userId}-${election_id}-${candidate_id}-${Date.now()}`).digest('hex').substring(0, 16);

    // Record Vote
    const newVote = {
      id: `vote-${Date.now()}`,
      user_id: userId,
      candidate_id,
      election_id,
      hash_code: hash,
      timestamp: new Date().toISOString()
    };

    store.votes.push(newVote);

    // Increment Candidate Vote Counter
    candidate.vote_count += 1;

    // Log Audit Trail
    logAuditAction(req.user.name, 'VOTE_CAST', `Successfully cast vote in '${election.title}' for position ${candidate.position}`);

    res.status(201).json({
      message: 'Vote cast successfully! Your vote has been securely recorded.',
      vote: {
        id: newVote.id,
        election_title: election.title,
        candidate_name: candidate.name,
        position: candidate.position,
        hash_code: hash,
        timestamp: newVote.timestamp
      }
    });

  } catch (err) {
    console.error('Vote casting error:', err);
    res.status(500).json({ error: 'Internal error while processing vote submission.' });
  }
});

// GET USER'S VOTING HISTORY
router.get('/my-votes', verifyToken, requireStudent, (req, res) => {
  const userVotes = store.votes.filter(v => v.user_id === req.user.id);
  const detailedVotes = userVotes.map(v => {
    const election = store.elections.find(e => e.id === v.election_id);
    const candidate = store.candidates.find(c => c.id === v.candidate_id);
    return {
      ...v,
      election_title: election ? election.title : 'Election',
      candidate_name: candidate ? candidate.name : 'Candidate',
      candidate_position: candidate ? candidate.position : 'Position'
    };
  });
  res.json({ votes: detailedVotes });
});

export default router;

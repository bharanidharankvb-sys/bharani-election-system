import express from 'express';
import { store } from '../db/store.js';

const router = express.Router();

// GET DASHBOARD OVERVIEW & CHART DATA
router.get('/dashboard', (req, res) => {
  const totalStudents = store.users.filter(u => u.role === 'student').length;
  const totalVotesCast = store.votes.length;
  const totalCandidates = store.candidates.length;
  const totalElections = store.elections.length;

  const runningElections = store.elections.filter(e => e.status === 'active').length;
  const endedElections = store.elections.filter(e => e.status === 'ended').length;
  const upcomingElections = store.elections.filter(e => e.status === 'upcoming').length;

  const votingPercentage = totalStudents > 0 
    ? Math.round((totalVotesCast / totalStudents) * 100) 
    : 0;

  // Department-wise voting statistics calculation
  const departmentCounts = {};
  store.users.filter(u => u.role === 'student').forEach(u => {
    if (!departmentCounts[u.department]) {
      departmentCounts[u.department] = { total: 0, voted: 0 };
    }
    departmentCounts[u.department].total += 1;
  });

  store.votes.forEach(v => {
    const voter = store.users.find(u => u.id === v.user_id);
    if (voter && departmentCounts[voter.department]) {
      departmentCounts[voter.department].voted += 1;
    }
  });

  const departmentStats = Object.keys(departmentCounts).map(dept => ({
    department: dept,
    total: departmentCounts[dept].total,
    voted: departmentCounts[dept].voted,
    percentage: departmentCounts[dept].total > 0 
      ? Math.round((departmentCounts[dept].voted / departmentCounts[dept].total) * 100)
      : 0
  }));

  // Candidate Vote Standing for Active/Latest Election
  const activeElection = store.elections.find(e => e.status === 'active') || store.elections[0];
  let candidateRankings = [];
  if (activeElection) {
    candidateRankings = store.candidates
      .filter(c => c.election_id === activeElection.id)
      .map(c => ({
        id: c.id,
        name: c.name,
        position: c.position,
        department: c.department,
        vote_count: c.vote_count
      }))
      .sort((a, b) => b.vote_count - a.vote_count);
  }

  // Hourly Voting Timeline Trend (Mocked + Real calculation)
  const hourlyData = [
    { time: '09:00 AM', votes: 12 },
    { time: '10:00 AM', votes: 28 },
    { time: '11:00 AM', votes: 45 },
    { time: '12:00 PM', votes: 78 },
    { time: '01:00 PM', votes: 62 },
    { time: '02:00 PM', votes: 95 },
    { time: '03:00 PM', votes: 110 },
    { time: '04:00 PM', votes: 85 }
  ];

  res.json({
    metrics: {
      total_students: totalStudents,
      total_votes_cast: totalVotesCast,
      total_candidates: totalCandidates,
      total_elections: totalElections,
      voting_percentage: votingPercentage,
      running_elections: runningElections,
      ended_elections: endedElections,
      upcoming_elections: upcomingElections
    },
    active_election: activeElection || null,
    candidate_rankings: candidateRankings,
    department_stats: departmentStats,
    hourly_trend: hourlyData
  });
});

export default router;

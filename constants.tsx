
import React from 'react';

export const NAVIGATION_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <i className="fa-solid fa-house"></i> },
  { id: 'interview', label: 'Mock Interview', icon: <i className="fa-solid fa-microphone-lines"></i> },
  { id: 'quiz', label: 'Daily Quiz', icon: <i className="fa-solid fa-code"></i> },
  { id: 'analytics', label: 'Performance', icon: <i className="fa-solid fa-chart-line"></i> },
];

export const MOCK_PERFORMANCE_DATA = [
  { category: 'Technical Skill', score: 85, fullMark: 100 },
  { category: 'Communication', score: 70, fullMark: 100 },
  { category: 'Confidence', score: 90, fullMark: 100 },
  { category: 'Problem Solving', score: 65, fullMark: 100 },
  { category: 'Clarity', score: 75, fullMark: 100 },
];

'use client';

import { useState } from 'react';
import { mockWorkout, type Exercise } from '../lib/data';

export default function TodayWorkout() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  
  const exerciseCount = mockWorkout.exercises.filter(e => 'id' in e).length;
  const completedCount = completed.size;
  const progress = Math.round((completedCount / exerciseCount) * 100);

  const toggleComplete = (id: string) => {
    const newCompleted = new Set(completed);
    if (newCompleted.has(id)) {
      newCompleted.delete(id);
    } else {
      newCompleted.add(id);
    }
    setCompleted(newCompleted);
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Today&apos;s Workout</h1>
        <p>{mockWorkout.focus}</p>
        <span className="date-badge">{mockWorkout.date}</span>
        
        <div className="progress-section">
          <div className="progress-text">
            {completedCount} of {exerciseCount} exercises complete
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      <div className="workout-list">
        {mockWorkout.exercises.map((item, index) => {
          if ('type' in item && item.type === 'rest') {
            return (
              <div key={`rest-${index}`} className="rest-card">
                <h3>Rest Period</h3>
                <p>{item.duration} seconds</p>
              </div>
            );
          }

          const exercise = item as Exercise;
          const isCompleted = completed.has(exercise.id);

          return (
            <div 
              key={exercise.id} 
              className={`exercise-card ${isCompleted ? 'completed' : ''}`}
            >
              <div className="exercise-header">
                <div>
                  <span className="exercise-number">{index + 1}</span>
                  <span className="exercise-title">{exercise.name}</span>
                  <div className="exercise-meta">
                    <span className="sets">{exercise.sets} sets</span>
                    <span>×</span>
                    <span>{exercise.reps} reps</span>
                  </div>
                </div>
              </div>

              <div className="video-container">
                <div className="video-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <p>Demo video<br/>placeholder</p>
                </div>
              </div>

              {exercise.notes && (
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                  {exercise.notes}
                </p>
              )}

              <button 
                className={`complete-btn ${isCompleted ? 'completed' : 'pending'}`}
                onClick={() => toggleComplete(exercise.id)}
              >
                {isCompleted ? (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Completed
                  </>
                ) : (
                  'Mark as Complete'
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

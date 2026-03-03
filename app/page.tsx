'use client';

import { useState, useEffect } from 'react';
import { fetchWorkouts, saveLog, getLogForExercise, type Exercise, type Workout, type WorkoutLog } from '../lib/sheets';

export default function TodayWorkout() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<string>('Workout A');
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<Map<string, WorkoutLog>>(new Map());

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchWorkouts();
        setWorkouts(data);
      } catch (e) {
        console.error('Failed to load workouts:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const currentWorkout = workouts.find(w => w.name.includes(selectedWorkout.split(' ')[1]?.charAt(0) || 'A')) || workouts[0];
  
  const exerciseCount = currentWorkout?.exercises.length || 0;
  const completedCount = Array.from(logs.values()).filter(l => l.completed).length;
  const progress = exerciseCount > 0 ? Math.round((completedCount / exerciseCount) * 100) : 0;

  const handleLog = (exerciseId: string, field: 'weight' | 'reps', value: string) => {
    const today = new Date().toISOString().split('T')[0];
    const existing = logs.get(exerciseId) || { exerciseId, date: today, weight: '', reps: '', completed: false };
    const updated = { ...existing, [field]: value };
    logs.set(exerciseId, updated);
    setLogs(new Map(logs));
    saveLog(updated);
  };

  const toggleComplete = (exerciseId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const existing = logs.get(exerciseId) || { exerciseId, date: today, weight: '', reps: '', completed: false };
    const updated = { ...existing, completed: !existing.completed };
    logs.set(exerciseId, updated);
    setLogs(new Map(logs));
    saveLog(updated);
  };

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <p>Loading workouts...</p>
        </div>
      </div>
    );
  }

  const workoutOptions = ['Workout A', 'Workout B', 'Workout C'];

  return (
    <div className="container">
      <header className="header">
        <h1>Today's Workout</h1>
        
        {/* Workout Selector */}
        <div className="workout-selector">
          {workoutOptions.map(opt => (
            <button
              key={opt}
              className={`selector-btn ${selectedWorkout === opt ? 'active' : ''}`}
              onClick={() => setSelectedWorkout(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
        
        <p className="focus">{currentWorkout?.name || 'Select a workout'}</p>
        
        <div className="progress-section">
          <div className="progress-text">
            {completedCount} of {exerciseCount} exercises complete
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      <div className="workout-list">
        {currentWorkout?.exercises.map((exercise, index) => {
          const log = logs.get(exercise.id);
          const isCompleted = log?.completed || false;

          return (
            <div key={exercise.id} className={`exercise-card ${isCompleted ? 'completed' : ''}`}>
              <div className="exercise-header">
                <div>
                  <span className="exercise-number">{index + 1}</span>
                  <span className="exercise-title">{exercise.name}</span>
                  <div className="exercise-meta">
                    <span className="sets">{exercise.sets} sets</span>
                    <span>×</span>
                    <span>{exercise.reps}</span>
                  </div>
                </div>
                {exercise.tempo && (
                  <span className="tempo-badge">Tempo: {exercise.tempo}</span>
                )}
              </div>

              {/* Load/Weight inputs */}
              <div className="weight-tracking">
                <div className="input-group">
                  <label>Weight (lbs)</label>
                  <input
                    type="number"
                    placeholder="Load"
                    value={log?.weight || ''}
                    onChange={(e) => handleLog(exercise.id, 'weight', e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label>Actual Reps</label>
                  <input
                    type="number"
                    placeholder="Reps"
                    value={log?.reps || ''}
                    onChange={(e) => handleLog(exercise.id, 'reps', e.target.value)}
                  />
                </div>
                {exercise.rest && (
                  <div className="rest-badge">
                    <span>Rest: {exercise.rest}</span>
                  </div>
                )}
              </div>

              {exercise.notes && (
                <p className="exercise-notes">{exercise.notes}</p>
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

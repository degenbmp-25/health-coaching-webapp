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
        console.log('Loaded workouts:', data.map(w => w.name));
      } catch (e) {
        console.error('Failed to load workouts:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Group exercises by category
  const currentWorkout = workouts.find(w => w.name.includes(selectedWorkout.split(' ')[1]?.charAt(0) || 'A')) || workouts[0];
  
  const exercisesByCategory = currentWorkout?.exercises.reduce((acc, ex) => {
    const cat = ex.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ex);
    return acc;
  }, {} as Record<string, Exercise[]>) || {};

  const exerciseCount = currentWorkout?.exercises.length || 0;
  const completedCount = Array.from(logs.values()).filter(l => l.completed).length;
  const progress = exerciseCount > 0 ? Math.round((completedCount / exerciseCount) * 100) : 0;

  const handleLog = (exerciseId: string, setIndex: number, value: string) => {
    const today = new Date().toISOString().split('T')[0];
    const key = `${exerciseId}_${setIndex}`;
    const existing = logs.get(key) || { exerciseId, date: today, weight: '', reps: '', completed: false };
    const updated = { ...existing, weight: value };
    logs.set(key, updated);
    setLogs(new Map(logs));
    saveLog(updated);
  };

  const handleReps = (exerciseId: string, setIndex: number, value: string) => {
    const today = new Date().toISOString().split('T')[0];
    const key = `${exerciseId}_${setIndex}`;
    const existing = logs.get(key) || { exerciseId, date: today, weight: '', reps: '', completed: false };
    const updated = { ...existing, reps: value };
    logs.set(key, updated);
    setLogs(new Map(logs));
    saveLog(updated);
  };

  const toggleComplete = (exerciseId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const allSetKeys = Array.from(logs.keys()).filter(k => k.startsWith(exerciseId));
    let allCompleted = true;
    allSetKeys.forEach(key => {
      const log = logs.get(key);
      if (log && !log.completed) allCompleted = false;
    });
    
    // Toggle all sets for this exercise
    allSetKeys.forEach(key => {
      const log = logs.get(key);
      if (log) {
        const updated = { ...log, completed: !allCompleted };
        logs.set(key, updated);
        saveLog(updated);
      }
    });
    setLogs(new Map(logs));
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
        {Object.entries(exercisesByCategory).map(([category, exercises]) => (
          <div key={category} className="category-section">
            <h2 className="category-header">{category}</h2>
            
            {exercises.map((exercise, idx) => {
              // Get all set keys for this exercise
              const setKeys = Array.from({ length: exercise.sets }, (_, i) => `${exercise.id}_${i}`);
              const isCompleted = setKeys.every(key => logs.get(key)?.completed);
              const hasAnyData = setKeys.some(key => logs.get(key)?.weight || logs.get(key)?.reps);

              return (
                <div key={exercise.id} className={`exercise-card ${isCompleted ? 'completed' : ''}`}>
                  <div className="exercise-header">
                    <div>
                      <span className="exercise-number">{idx + 1}</span>
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

                  {/* Dynamic load fields based on sets */}
                  <div className="sets-container">
                    {Array.from({ length: exercise.sets }, (_, setIndex) => {
                      const log = logs.get(`${exercise.id}_${setIndex}`);
                      return (
                        <div key={setIndex} className="set-row">
                          <span className="set-label">Set {setIndex + 1}</span>
                          <div className="set-inputs">
                            <div className="input-group">
                              <label>Weight</label>
                              <input
                                type="text"
                                placeholder={exercise.load[setIndex] || '-'}
                                value={log?.weight || ''}
                                onChange={(e) => handleLog(exercise.id, setIndex, e.target.value)}
                              />
                            </div>
                            <div className="input-group">
                              <label>Reps</label>
                              <input
                                type="text"
                                placeholder={exercise.reps}
                                value={log?.reps || ''}
                                onChange={(e) => handleReps(exercise.id, setIndex, e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {exercise.rest && (
                      <div className="rest-info">
                        Rest: {exercise.rest}
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
        ))}
      </div>
    </div>
  );
}

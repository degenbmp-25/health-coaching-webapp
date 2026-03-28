'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchWorkouts, saveLog, type Exercise, type Workout, type WorkoutLog } from '../lib/sheets';
import ErrorCard from './components/ErrorCard';
import WorkoutSkeleton from './components/WorkoutSkeleton';
import AuthGuard from './components/AuthGuard';

export default function TodayWorkout() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<string>('Workout A');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(null);
  const [logs, setLogs] = useState<Map<string, WorkoutLog>>(new Map());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWorkouts();
      setWorkouts(data);
    } catch (e) {
      setError({
        message: e instanceof Error ? e.message : 'Unable to load workouts. Please check your connection.',
        retry: load
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Get all workout names from the sheet for the selector
  const availableWorkouts = workouts.length > 0
    ? workouts.map(w => w.name.replace(/\(.*\)/, '').trim())
    : ['Workout A', 'Workout B', 'Workout C', 'Workout D', 'Workout E'];

  const currentWorkout = workouts.find(w => {
    const target = selectedWorkout.replace('Workout ', '').charAt(0);
    return w.name.includes(`(${target}`) || w.name.includes(target);
  }) || workouts[0];

  const exercisesByCategory = useMemo(() => 
    currentWorkout?.exercises.reduce((acc, ex) => {
      const cat = ex.category || 'General';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(ex);
      return acc;
    }, {} as Record<string, Exercise[]>) || {},
  [currentWorkout]);

  const { completedCount, progress } = useMemo(() => {
    const exerciseCount = currentWorkout?.exercises.length || 0;
    const completed = Array.from(logs.values()).filter(l => l.completed).length;
    const pct = exerciseCount > 0 ? Math.round((completed / exerciseCount) * 100) : 0;
    return { completedCount: completed, progress: pct };
  }, [logs, currentWorkout]);

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
    const allSetKeys = Array.from(logs.keys()).filter(k => k.startsWith(exerciseId));
    let allCompleted = true;
    allSetKeys.forEach(key => {
      const log = logs.get(key);
      if (log && !log.completed) allCompleted = false;
    });

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
        <WorkoutSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <header className="header">
          <h1>Today's Workout</h1>
        </header>
        <ErrorCard message={error.message} onRetry={error.retry} />
      </div>
    );
  }

  // Use available workouts from sheet or fallback to A-E
  const workoutOptions = availableWorkouts.length >= 5
    ? availableWorkouts
    : ['Workout A', 'Workout B', 'Workout C', 'Workout D', 'Workout E'];

  return (
    <AuthGuard>
      <div className="container">
        <header className="header">
          <h1>Today&apos;s Workout</h1>

          {/* Workout Selector - scrollable for A-E */}
          <div className="workout-selector">
            {workoutOptions.map((opt) => (
              <button
                key={opt}
                className={`selector-btn ${selectedWorkout === opt ? 'active' : ''}`}
                onClick={() => setSelectedWorkout(opt)}
              >
                {opt.replace('Workout ', '')}
              </button>
            ))}
          </div>

          <p className="focus">{currentWorkout?.name || 'Select a workout'}</p>

          <div className="progress-section">
            <div className="progress-text">
              {completedCount} of {currentWorkout?.exercises.length || 0} exercises complete
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </header>

        <div className="workout-list">
          {Object.keys(exercisesByCategory).length === 0 ? (
            <div className="empty-state">
              <h3>No exercises found</h3>
              <p>Add exercises to {selectedWorkout} in your Google Sheet</p>
            </div>
          ) : (
            Object.entries(exercisesByCategory).map(([category, exercises]) => (
              <div key={category} className="category-section">
                <h2 className="category-header">{category}</h2>

                {exercises.map((exercise, i) => {
                  const setKeys = Array.from({ length: exercise.sets }, (_, idx) => `${exercise.id}_${idx}`);
                  const isCompleted = setKeys.every(key => logs.get(key)?.completed);

                  return (
                    <div key={exercise.id} className={`exercise-card ${isCompleted ? 'completed' : ''}`}>
                      <div className="exercise-header">
                        <div>
                          <span className="exercise-number">{i + 1}</span>
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

                      {/* Video placeholder */}
                      <div className="video-container">
                        {exercise.videoUrl ? (
                          <div className="video-placeholder has-video">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                            <p>{exercise.videoUrl}</p>
                          </div>
                        ) : (
                          <div className="video-placeholder">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                              <line x1="7" y1="2" x2="7" y2="22" />
                              <line x1="17" y1="2" x2="17" y2="22" />
                              <line x1="2" y1="12" x2="22" y2="12" />
                              <line x1="2" y1="7" x2="7" y2="7" />
                              <line x1="2" y1="17" x2="7" y2="17" />
                              <line x1="17" y1="17" x2="22" y2="17" />
                              <line x1="17" y1="7" x2="22" y2="7" />
                            </svg>
                            <p>Demo video<br />placeholder</p>
                          </div>
                        )}
                      </div>

                      {/* Dynamic load fields */}
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

                      {exercise.notes && !exercise.videoUrl && (
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
            ))
          )}
        </div>
      </div>
    </AuthGuard>
  );
}

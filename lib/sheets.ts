// Google Sheets integration for workout data
// Uses published CSV for simplicity

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSC1zuoJ5orO_jtqeFtCjbO-IUXMXhTe1tcx2REMppG_MIOTCpDWUQsq65Ds1_SXX_oYkqVjQsByTpW/pub?output=csv';

export interface Exercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
  tempo: string;
  rest: string;
  load: string[];
  notes: string;
  videoUrl?: string;
}

export interface Workout {
  id: string;
  name: string;
  section: string;
  exercises: Exercise[];
}

export interface WorkoutLog {
  exerciseId: string;
  date: string;
  weight: string;
  reps: string;
  completed: boolean;
}

function parseCSV(csv: string): string[][] {
  const lines = csv.split('\n');
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

export async function fetchWorkouts(): Promise<Workout[]> {
  const response = await fetch(SHEET_CSV_URL);
  const csv = await response.text();
  const data = parseCSV(csv);
  
  const workouts: Workout[] = [];
  let currentWorkout: { name: string; section: string; exercises: Exercise[] } | null = null;
  let exerciseCounter = 0;
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const firstCell = row[0] || '';
    
    // Detect workout headers
    if (firstCell.startsWith('Workout')) {
      if (currentWorkout) {
        workouts.push({ ...currentWorkout, id: `w${workouts.length + 1}` });
      }
      currentWorkout = {
        name: firstCell.replace(',', '').trim(),
        section: '',
        exercises: []
      };
      continue;
    }
    
    // Detect section headers
    if (firstCell === 'Movement Prep' || firstCell === 'Elasticity/Power/Speed/Agility/Skill' || 
        firstCell === 'Resistance' || firstCell === 'Metabolic/Supplemental/Recovery') {
      if (currentWorkout) {
        if (currentWorkout.exercises.length > 0) {
          workouts.push({ ...currentWorkout, id: `w${workouts.length + 1}` });
          currentWorkout = { name: currentWorkout.name, section: firstCell, exercises: [] };
        } else {
          currentWorkout.section = firstCell;
        }
      }
      continue;
    }
    
    // Detect exercise rows (start with I, II, III, IV)
    if (['I', 'II', 'III', 'IV'].includes(firstCell) && row[1]) {
      const exercise: Exercise = {
        id: `e${++exerciseCounter}`,
        name: row[1] || '',
        sets: row[2] || '',
        reps: '',
        tempo: row[8] || '',
        rest: row[9] || '',
        load: [row[3] || '', row[4] || '', row[5] || '', row[6] || '', row[7] || ''].filter(l => l),
        notes: row[10] || ''
      };
      
      // Parse sets/reps (format like "4x10RM")
      const setsReps = row[2] || '';
      const match = setsReps.match(/(\d+)x(\d+(?:RM)?)/);
      if (match) {
        exercise.sets = match[1];
        exercise.reps = match[2];
      }
      
      if (currentWorkout) {
        currentWorkout.exercises.push(exercise);
      }
    }
  }
  
  // Add last workout
  if (currentWorkout && currentWorkout.exercises.length > 0) {
    workouts.push({ ...currentWorkout, id: `w${workouts.length + 1}` });
  }
  
  return workouts;
}

// Local storage for workout logs
const LOGS_KEY = 'workout_logs';

export function saveLog(log: WorkoutLog): void {
  const logs = getLogs();
  const existingIndex = logs.findIndex(l => l.exerciseId === log.exerciseId && l.date === log.date);
  if (existingIndex >= 0) {
    logs[existingIndex] = log;
  } else {
    logs.push(log);
  }
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

export function getLogs(): WorkoutLog[] {
  const stored = localStorage.getItem(LOGS_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function getLogForExercise(exerciseId: string, date: string): WorkoutLog | undefined {
  return getLogs().find(l => l.exerciseId === exerciseId && l.date === date);
}

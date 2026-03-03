// Google Sheets integration for workout data
// Uses published CSV for simplicity

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSC1zuoJ5orO_jtqeFtCjbO-IUXMXhTe1tcx2REMppG_MIOTCpDWUQsq65Ds1_SXX_oYkqVjQsByTpW/pub?output=csv';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  tempo: string;
  rest: string;
  load: string[];
  notes: string;
  videoUrl?: string;
  category?: string;
}

export interface Workout {
  id: string;
  name: string;
  category?: string;
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

function extractVideoUrl(notes: string): string | undefined {
  // Look for .MOV, .MP4, .HEIC patterns in notes
  const match = notes.match(/([a-zA-Z0-9_.-]+\.(MOV|MP4|HEIC|mov|mp4|heic))/);
  return match ? match[0] : undefined;
}

export async function fetchWorkouts(): Promise<Workout[]> {
  const response = await fetch(SHEET_CSV_URL);
  const csv = await response.text();
  const data = parseCSV(csv);
  
  const workouts: Workout[] = [];
  let currentWorkout: { category?: string; name: string; exercises: Exercise[] } | null = null;
  let currentCategory = '';
  let exerciseCounter = 0;
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const firstCell = (row[0] || '').trim();
    const secondCell = (row[1] || '').trim();
    
    // Detect workout headers (e.g., "Workout A (Legs 1)")
    if (firstCell.startsWith('Workout') && firstCell.includes('(')) {
      if (currentWorkout && currentWorkout.exercises.length > 0) {
        workouts.push({ ...currentWorkout, id: `w${workouts.length + 1}`, category: currentWorkout.name });
      }
      currentWorkout = { category: '',
        name: firstCell.replace(',', '').trim(),
        exercises: []
      };
      currentCategory = '';
      continue;
    }
    
    // Detect category headers
    if (firstCell === '#' && (secondCell === 'Movement Prep' || 
        secondCell === 'Elasticity/Power/Speed/Agility/Skill' || 
        secondCell === 'Resistance' || 
        secondCell === 'Metabolic/Supplemental/Recovery')) {
      currentCategory = secondCell;
      continue;
    }
    
    // Skip meta rows
    if (firstCell === 'General notes' || firstCell === '#' || firstCell.startsWith('RST=') || firstCell.startsWith('BB=') || firstCell.startsWith('HK=')) {
      continue;
    }
    
    // Skip empty rows or rows without exercise name
    if (!row[1] || row[1].trim() === '') {
      continue;
    }
    
    // Detect exercise rows (start with I, II, III, IV)
    if (['I', 'II', 'III', 'IV'].includes(firstCell) && row[1]) {
      const setsReps = row[2] || '';
      const setsMatch = setsReps.match(/(\d+)x/);
      const sets = setsMatch ? parseInt(setsMatch[1]) : 1;
      const reps = setsReps.replace(/^\d+x/, '').replace('RM', ' RM').trim();
      
      // Load columns: 3,4,5,6,7
      const load = [row[3], row[4], row[5], row[6], row[7]].filter(l => l && l.trim());
      
      // Tempo is column 9, Rest is column 10
      const tempo = row[9] || '';
      const rest = row[10] || '';
      const notes = row[11] || '';
      
      const exercise: Exercise = {
        id: `e${++exerciseCounter}`,
        name: row[1] || '',
        sets,
        reps,
        tempo,
        rest,
        load,
        notes,
        videoUrl: extractVideoUrl(notes),
        category: currentCategory || 'General'
      };
      
      if (currentWorkout) {
        currentWorkout.exercises.push(exercise);
      }
    }
  }
  
  // Add last workout
  if (currentWorkout && currentWorkout.exercises.length > 0) {
    workouts.push({ ...currentWorkout, id: `w${workouts.length + 1}`, category: currentWorkout.name });
  }
  
  console.log('Parsed workouts:', workouts.map(w => w.name));
  return workouts;
}

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

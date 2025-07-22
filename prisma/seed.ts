const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const exercisesData = [
  { name: 'Push-up', category: 'Bodyweight', muscleGroup: 'Chest, Shoulders, Triceps', description: 'Standard push-up focusing on chest activation.', equipment: 'None' },
  { name: 'Squat', category: 'Bodyweight', muscleGroup: 'Quads, Glutes, Hamstrings', description: 'Bodyweight squat focusing on depth and form.', equipment: 'None' },
  { name: 'Pull-up', category: 'Bodyweight', muscleGroup: 'Back, Biceps', description: 'Standard pull-up. Use assistance if needed.', equipment: 'Pull-up Bar' },
  { name: 'Plank', category: 'Core', muscleGroup: 'Abs, Core', description: 'Hold a static plank position.', equipment: 'None' },
  { name: 'Bench Press', category: 'Barbell', muscleGroup: 'Chest, Shoulders, Triceps', description: 'Standard barbell bench press.', equipment: 'Barbell, Bench' },
  { name: 'Deadlift', category: 'Barbell', muscleGroup: 'Back, Hamstrings, Glutes, Quads', description: 'Conventional barbell deadlift.', equipment: 'Barbell' },
  { name: 'Overhead Press', category: 'Barbell', muscleGroup: 'Shoulders, Triceps', description: 'Standing barbell overhead press.', equipment: 'Barbell' },
  { name: 'Barbell Row', category: 'Barbell', muscleGroup: 'Back, Biceps', description: 'Bent-over barbell row.', equipment: 'Barbell' },
  { name: 'Bicep Curl', category: 'Dumbbell', muscleGroup: 'Biceps', description: 'Standard dumbbell bicep curl.', equipment: 'Dumbbells' },
  { name: 'Tricep Extension', category: 'Dumbbell', muscleGroup: 'Triceps', description: 'Overhead dumbbell tricep extension.', equipment: 'Dumbbell' },
  { name: 'Lateral Raise', category: 'Dumbbell', muscleGroup: 'Shoulders', description: 'Dumbbell lateral raise targeting side deltoids.', equipment: 'Dumbbells' },
  { name: 'Leg Press', category: 'Machine', muscleGroup: 'Quads, Glutes, Hamstrings', description: 'Standard leg press machine.', equipment: 'Leg Press Machine' },
  { name: 'Lat Pulldown', category: 'Machine', muscleGroup: 'Back, Biceps', description: 'Lat pulldown machine.', equipment: 'Lat Pulldown Machine' },
  { name: 'Running', category: 'Cardio', muscleGroup: 'Full Body', description: 'Steady-state running.', equipment: 'None' },
  { name: 'Cycling', category: 'Cardio', muscleGroup: 'Legs, Full Body', description: 'Indoor or outdoor cycling.', equipment: 'Bicycle/Stationary Bike' },
];

async function main() {
  console.log(`Start seeding ...`);

  // Use createMany for efficiency, skip duplicates based on name (or another unique field if applicable)
  try {
    const created = await prisma.exercise.createMany({
      data: exercisesData,
      skipDuplicates: true, // Optional: Prevent errors if you run the seed multiple times
    });
    console.log(`Created ${created.count} exercises.`);
  } catch (error) {
    console.error('Error seeding exercises:', error);
    process.exit(1);
  }

  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 
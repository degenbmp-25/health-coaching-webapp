import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const exercises = await prisma.workoutExercise.findMany({
    where: { muxPlaybackId: { not: null } },
    select: { id: true, videoUrl: true, muxPlaybackId: true }
  })
  console.log('Current muxPlaybackIds in DB:')
  exercises.forEach(e => {
    console.log(`${e.videoUrl} -> ${e.muxPlaybackId}`)
  })
}

main().finally(() => prisma.$disconnect())
import { db } from "./lib/db";

async function main() {
  const users = await db.user.findMany({
    where: {
      email: {
        contains: 'bmp19076'
      }
    },
    include: {
      organizationMemberships: true
    }
  });
  console.log(JSON.stringify(users, null, 2));
}

main().catch(console.error);

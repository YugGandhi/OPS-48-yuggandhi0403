import { PrismaClient, Role, IssueCategory, IssueStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Clearing old data...');
    await prisma.issueAudit.deleteMany({});
    await prisma.upvote.deleteMany({});
    await prisma.issue.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.ward.deleteMany({});

    console.log('Seeding Database...');

    // 1. Create a Ward
    const ward1 = await prisma.ward.create({
        data: {
            name: 'Downtown Ward A',
        }
    });

    const ward2 = await prisma.ward.create({
        data: {
            name: 'Northside Ward B',
        }
    });

    // 2. Create Users
    const passwordHash = await bcrypt.hash('password123', 10);

    const admin = await prisma.user.create({
        data: {
            name: 'City Admin',
            email: 'admin@civicpulse.com',
            password: passwordHash,
            role: Role.ADMIN,
        }
    });

    const officer1 = await prisma.user.create({
        data: {
            name: 'Officer John (Downtown)',
            email: 'john@civicpulse.com',
            password: passwordHash,
            role: Role.OFFICER,
            assignedWardId: ward1.id,
        }
    });

    const officer2 = await prisma.user.create({
        data: {
            name: 'Officer Sarah (Northside)',
            email: 'sarah@civicpulse.com',
            password: passwordHash,
            role: Role.OFFICER,
            assignedWardId: ward2.id,
        }
    });

    const citizen = await prisma.user.create({
        data: {
            name: 'Jane Citizen',
            email: 'jane@civicpulse.com',
            password: passwordHash,
            role: Role.CITIZEN,
        }
    });

    // 3. Create Issues (Downtown)
    const issue1 = await prisma.issue.create({
        data: {
            title: 'Massive Pothole on Main St',
            description: 'There is a huge pothole causing traffic near the intersection.',
            category: IssueCategory.ROADS,
            status: IssueStatus.REPORTED,
            latitude: 23.0225,
            longitude: 72.5714,
            aiSummary: 'Severity: High. Action: Patch pothole on Main St immediately to prevent vehicle damage.',
            reporterId: citizen.id,
            wardId: ward1.id,
        }
    });
    await prisma.$executeRaw`UPDATE "Issue" SET location = ST_SetSRID(ST_MakePoint(${72.5714}, ${23.0225}), 4326) WHERE id = ${issue1.id}`;

    const issue2 = await prisma.issue.create({
        data: {
            title: 'Broken Streetlight',
            description: 'Streetlight has been out for 3 days making the alley unsafe.',
            category: IssueCategory.LIGHTING,
            status: IssueStatus.IN_PROGRESS,
            latitude: 23.0240,
            longitude: 72.5730,
            aiSummary: 'Severity: Medium. Action: Replace bulb in streetlight alleyway.',
            reporterId: citizen.id,
            wardId: ward1.id,
        }
    });
    await prisma.$executeRaw`UPDATE "Issue" SET location = ST_SetSRID(ST_MakePoint(${72.5730}, ${23.0240}), 4326) WHERE id = ${issue2.id}`;

    const issue3 = await prisma.issue.create({
        data: {
            title: 'Water Pipe Burst',
            description: 'Water is gushing out of the sidewalk.',
            category: IssueCategory.WATER,
            status: IssueStatus.RESOLVED,
            latitude: 23.0210,
            longitude: 72.5700,
            aiSummary: 'Severity: Critical. Action: Dispatch plumbing team to fix water main.',
            reporterId: citizen.id,
            wardId: ward1.id,
        }
    });
    await prisma.$executeRaw`UPDATE "Issue" SET location = ST_SetSRID(ST_MakePoint(${72.5700}, ${23.0210}), 4326) WHERE id = ${issue3.id}`;

    // Northside (Will appear on Admin heatmap but not Officer John's queue)
    const issue4 = await prisma.issue.create({
        data: {
            title: 'Illegal Garbage Dumping',
            description: 'Piles of trash dumped behind the park.',
            category: IssueCategory.GARBAGE,
            status: IssueStatus.REPORTED,
            latitude: 23.0350,
            longitude: 72.5800,
            aiSummary: 'Severity: Medium. Action: Send sanitation crew to clear illegal dumping.',
            reporterId: citizen.id,
            wardId: ward2.id,
        }
    });
    await prisma.$executeRaw`UPDATE "Issue" SET location = ST_SetSRID(ST_MakePoint(${72.5800}, ${23.0350}), 4326) WHERE id = ${issue4.id}`;

    console.log('Seeding Complete! 🎉\n');
    console.log('--- TEST CREDENTIALS (password for all: password123) ---');
    console.log(`ADMIN   : ${admin.email}`);
    console.log(`OFFICER : ${officer1.email} (Ward: ${ward1.name})`);
    console.log(`OFFICER : ${officer2.email} (Ward: ${ward2.name})`);
    console.log(`CITIZEN : ${citizen.email}`);
    console.log('------------------------------------------------------');
}

main()
    .catch((e) => {
        console.error(e);
        throw e;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

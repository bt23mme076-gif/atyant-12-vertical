// One-shot script: `npm run seed:roadmap`
// Creates the 7 roadmap pillars (+ a couple of placeholder items each) and
// one active Founding batch/cohort, so the new /roadmap page has real
// content to render instead of an empty state. Safe to re-run — it skips
// pillars/batches that already exist.
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { RoadmapPillar } from '../models/RoadmapPillar.js';
import { RoadmapItem } from '../models/RoadmapItem.js';
import { Batch } from '../models/Batch.js';
import { CareerPath } from '../models/CareerPath.js';
import { FaqVideo } from '../models/FaqVideo.js';

const PILLARS = [
  {
    key: 'college-arrival',
    title: 'College Arrival Guide',
    tagline: 'Everything a fresher needs — before, during, after day one.',
    icon: 'Compass',
    order: 1,
    items: [
      { title: 'Before You Arrive: Documents & Packing Checklist', type: 'document', durationLabel: '5 min read' },
      { title: 'Your First Week: Hostel, Mess & Making Friends', type: 'video', durationLabel: '8 min watch' },
    ],
  },
  {
    key: 'college-survival',
    title: 'College Survival System',
    tagline: 'Habits, time, finance, and mental health that actually work.',
    icon: 'ShieldCheck',
    order: 2,
    items: [
      { title: 'Managing Money on a Student Budget', type: 'article', durationLabel: '6 min read' },
      { title: 'Building Study Habits That Stick', type: 'video', durationLabel: '10 min watch' },
    ],
  },
  {
    key: 'career-exploration',
    title: 'Career Exploration Hub',
    tagline: '29 career paths. Roadmaps, quizzes, and 30-day challenges.',
    icon: 'Compass',
    order: 3,
    isFlagship: true,
    items: [
      { title: 'Take the Career Fit Quiz', type: 'quiz', durationLabel: '5 min' },
      { title: 'Software Engineering Roadmap', type: 'document', durationLabel: '12 min read', requiresReferralUnlock: true },
    ],
  },
  {
    key: 'execution-system',
    title: 'Execution System',
    tagline: 'Weekly goals, accountability, streaks. Show up daily.',
    icon: 'Flame',
    order: 4,
    items: [
      { title: 'Set Your First Weekly Goal', type: 'task', durationLabel: '2 min' },
      { title: 'Why Streaks Work: The Science of Showing Up', type: 'article', durationLabel: '4 min read' },
    ],
  },
  {
    key: 'industry-ready-skills',
    title: 'Industry Ready Skills',
    tagline: 'Resume, LinkedIn, interviews, GitHub — 8 hands-on modules.',
    icon: 'Briefcase',
    order: 5,
    items: [
      { title: 'Build a Resume That Gets Shortlisted', type: 'video', durationLabel: '15 min watch', requiresReferralUnlock: true },
      { title: 'Optimizing Your LinkedIn Profile', type: 'article', durationLabel: '5 min read' },
    ],
  },
  {
    key: 'mentor-alumni-stories',
    title: 'Mentor & Alumni Stories',
    tagline: '20+ real journeys from people who\u2019ve walked the path.',
    icon: 'Users',
    order: 6,
    items: [
      { title: 'From Tier 3 College to SDE @ Microsoft', type: 'video', durationLabel: '9 min watch' },
    ],
  },
  {
    key: 'community-accountability',
    title: 'Community & Accountability',
    tagline: 'WhatsApp groups, monthly challenges, leaderboard.',
    icon: 'MessagesSquare',
    order: 7,
    items: [
      { title: 'Join the Atyant WhatsApp Community', type: 'task', durationLabel: '1 min' },
    ],
  },
];

// "29 career paths. One platform." — first 16 are featured in the main
// grid; the rest roll into the "+N more paths inside the platform" count.
const CAREER_PATHS = [
  { title: 'Software Engineering', colorKey: 'rose', isFeatured: true },
  { title: 'Data Science', colorKey: 'violet', isFeatured: true },
  { title: 'Product Management', colorKey: 'emerald', isFeatured: true },
  { title: 'UI/UX Design', colorKey: 'amber', isFeatured: true },
  { title: 'Cybersecurity', colorKey: 'sky', isFeatured: true },
  { title: 'Cloud & DevOps', colorKey: 'rose', isFeatured: true },
  { title: 'Mechanical Core', colorKey: 'emerald', isFeatured: true },
  { title: 'Electronics & VLSI', colorKey: 'rose', isFeatured: true },
  { title: 'Civil & Infra', colorKey: 'violet', isFeatured: true },
  { title: 'Consulting', colorKey: 'sky', isFeatured: true },
  { title: 'Investment Banking', colorKey: 'amber', isFeatured: true },
  { title: 'MBA Prep', colorKey: 'sky', isFeatured: true },
  { title: 'GATE Prep', colorKey: 'rose', isFeatured: true },
  { title: 'MS Abroad', colorKey: 'emerald', isFeatured: true },
  { title: 'Entrepreneurship', colorKey: 'amber', isFeatured: true },
  { title: 'Game Development', colorKey: 'violet', isFeatured: true },
  { title: 'Digital Marketing', colorKey: 'amber', isFeatured: false },
  { title: 'Finance & FP&A', colorKey: 'emerald', isFeatured: false },
  { title: 'Supply Chain & Operations', colorKey: 'sky', isFeatured: false },
  { title: 'Robotics', colorKey: 'rose', isFeatured: false },
  { title: 'AI/ML Research', colorKey: 'violet', isFeatured: false },
  { title: 'Embedded Systems', colorKey: 'emerald', isFeatured: false },
  { title: 'Blockchain & Web3', colorKey: 'sky', isFeatured: false },
  { title: 'Technical Writing', colorKey: 'amber', isFeatured: false },
  { title: 'Sales & Business Development', colorKey: 'rose', isFeatured: false },
  { title: 'HR & People Ops', colorKey: 'violet', isFeatured: false },
  { title: 'Legal & Compliance', colorKey: 'emerald', isFeatured: false },
  { title: 'Biotech & Pharma', colorKey: 'sky', isFeatured: false },
  { title: 'Renewable Energy', colorKey: 'amber', isFeatured: false },
];

async function run() {
  await connectDB();

  for (const p of PILLARS) {
    const { items, ...pillarData } = p;
    let pillar = await RoadmapPillar.findOne({ key: p.key });
    if (!pillar) {
      pillar = await RoadmapPillar.create(pillarData);
      console.log(`✅ Created pillar: ${pillar.title}`);
    } else {
      console.log(`ℹ️  Pillar already exists: ${pillar.title}`);
    }

    for (const [idx, item] of items.entries()) {
      const exists = await RoadmapItem.findOne({ pillar: pillar._id, title: item.title });
      if (!exists) {
        await RoadmapItem.create({ ...item, pillar: pillar._id, order: idx });
        console.log(`   ➕ Added item: ${item.title}${item.requiresReferralUnlock ? ' (referral-gated)' : ''}`);
      }
    }
  }

  const existingBatch = await Batch.findOne({ code: 'FOUNDING' });
  if (!existingBatch) {
    await Batch.create({
      name: 'Founding Cohort',
      code: 'FOUNDING',
      description: 'The first cohort of students on the Atyant Roadmap.',
      isActive: true,
    });
    console.log('✅ Created Founding Cohort batch');
  } else {
    console.log('ℹ️  Founding Cohort batch already exists');
  }

  for (const [idx, cp] of CAREER_PATHS.entries()) {
    const slug = cp.title
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const exists = await CareerPath.findOne({ slug });
    if (!exists) {
      await CareerPath.create({ ...cp, slug, order: idx });
      console.log(`   ➕ Added career path: ${cp.title}`);
    }
  }
  console.log(`✅ Career paths seeded (${CAREER_PATHS.length} total)`);

  const FAQ_VIDEOS = [
    {
      question: 'How do I pick a career path if I have no idea what I want?',
      shortAnswer: "Start with the Career Fit Quiz — it takes 5 minutes.",
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    },
    {
      question: "What's the fastest way to build my first resume?",
      shortAnswer: 'Use the resume module in Industry Ready Skills.',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    },
    {
      question: 'How does the streak system work?',
      shortAnswer: 'Open or complete anything on the roadmap once a day.',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    },
  ];

  for (const [idx, faq] of FAQ_VIDEOS.entries()) {
    const exists = await FaqVideo.findOne({ question: faq.question });
    if (!exists) {
      await FaqVideo.create({ ...faq, order: idx });
      console.log(`   ➕ Added FAQ video: ${faq.question}`);
    }
  }
  console.log('✅ FAQ videos seeded (replace the placeholder videoUrl values from the admin panel)');

  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

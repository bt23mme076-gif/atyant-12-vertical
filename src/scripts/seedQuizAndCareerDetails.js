/**
 * seedQuizAndCareerDetails.js
 *
 * Seeds:
 *  1. 10 quiz questions with weighted options covering all 29 career paths
 *  2. Rich content for 3 reference career paths (Software Engineering, Data Science,
 *     Product Management) — used as templates for the rest
 *  3. Placeholder snapshots for the remaining 26 paths so /careers/:slug works immediately
 *
 * Run: node src/scripts/seedQuizAndCareerDetails.js
 */

import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { QuizQuestion } from '../models/QuizQuestion.js';
import { CareerPath } from '../models/CareerPath.js';

async function connectDB() {
  await mongoose.connect(config.mongoUri);
  console.log('✅ Connected to MongoDB');
}

// ─── QUIZ QUESTIONS ───────────────────────────────────────────────────────────
// Slugs used as weight keys must match exactly what CareerPath seeds use.

const QUIZ_QUESTIONS = [
  {
    id: 'q1-work-style',
    order: 1,
    question: 'Which best describes your ideal day at work?',
    subtext: 'Pick the option that feels most natural, even if you haven\'t tried it.',
    type: 'single_select',
    options: [
      {
        id: 'q1-a', label: 'Writing and debugging code to solve a technical problem',
        weights: {
          'software-engineering': 5, 'data-science': 2, 'cloud-and-devops': 3,
          'ai-ml-research': 3, 'embedded-systems': 3, 'cybersecurity': 2,
          'game-development': 3, 'blockchain-and-web3': 2, 'robotics': 2,
        },
      },
      {
        id: 'q1-b', label: 'Analyzing data, drawing charts, and finding patterns',
        weights: {
          'data-science': 5, 'ai-ml-research': 4, 'finance-and-fpanda': 3,
          'consulting': 2, 'investment-banking': 2, 'supply-chain-and-operations': 2,
        },
      },
      {
        id: 'q1-c', label: 'Talking to users, leading meetings, and shaping a product',
        weights: {
          'product-management': 5, 'consulting': 3, 'sales-and-business-development': 3,
          'digital-marketing': 2, 'mba-prep': 2, 'hr-and-people-ops': 2,
        },
      },
      {
        id: 'q1-d', label: 'Designing visuals, wireframes, or creative content',
        weights: {
          'ui-ux-design': 5, 'digital-marketing': 3, 'game-development': 2,
          'technical-writing': 2,
        },
      },
      {
        id: 'q1-e', label: 'Working with hardware, circuits, or physical systems',
        weights: {
          'electronics-and-vlsi': 5, 'mechanical-core': 5, 'embedded-systems': 4,
          'robotics': 4, 'renewable-energy': 3, 'civil-and-infra': 3,
        },
      },
    ],
  },

  {
    id: 'q2-ambiguity',
    order: 2,
    question: 'How comfortable are you when a problem has no clear right answer?',
    subtext: 'Think about a school or project situation.',
    type: 'single_select',
    options: [
      {
        id: 'q2-a', label: 'I thrive with ambiguity — I love figuring things out from scratch',
        weights: {
          'entrepreneurship': 5, 'product-management': 4, 'consulting': 4,
          'ai-ml-research': 3, 'data-science': 2, 'investment-banking': 2,
          'digital-marketing': 2, 'blockchain-and-web3': 3,
        },
      },
      {
        id: 'q2-b', label: 'I like some structure but can handle open-ended problems',
        weights: {
          'software-engineering': 3, 'data-science': 3, 'product-management': 3,
          'cloud-and-devops': 2, 'cybersecurity': 2, 'ui-ux-design': 3,
          'sales-and-business-development': 2,
        },
      },
      {
        id: 'q2-c', label: 'I prefer clear requirements and well-defined deliverables',
        weights: {
          'gate-prep': 4, 'ms-abroad': 3, 'embedded-systems': 3, 'electronics-and-vlsi': 3,
          'mechanical-core': 3, 'civil-and-infra': 3, 'legal-and-compliance': 3,
          'finance-and-fpanda': 2, 'hr-and-people-ops': 2,
        },
      },
    ],
  },

  {
    id: 'q3-math',
    order: 3,
    question: 'How comfortable are you with heavy math and quantitative reasoning?',
    type: 'single_select',
    options: [
      {
        id: 'q3-a', label: 'Love it — probability, calculus, linear algebra feel natural',
        weights: {
          'data-science': 5, 'ai-ml-research': 5, 'gate-prep': 4, 'ms-abroad': 4,
          'finance-and-fpanda': 4, 'investment-banking': 4, 'electronics-and-vlsi': 3,
          'robotics': 3,
        },
      },
      {
        id: 'q3-b', label: 'Comfortable with moderate math — statistics, algebra',
        weights: {
          'software-engineering': 3, 'data-science': 3, 'cloud-and-devops': 2,
          'cybersecurity': 2, 'supply-chain-and-operations': 2, 'consulting': 2,
          'finance-and-fpanda': 2, 'biotech-and-pharma': 2,
        },
      },
      {
        id: 'q3-c', label: 'Minimal math — I prefer qualitative and creative work',
        weights: {
          'ui-ux-design': 4, 'digital-marketing': 4, 'product-management': 3,
          'technical-writing': 4, 'hr-and-people-ops': 4, 'sales-and-business-development': 3,
          'consulting': 2, 'legal-and-compliance': 3,
        },
      },
    ],
  },

  {
    id: 'q4-work-mode',
    order: 4,
    question: 'How do you prefer to work?',
    type: 'single_select',
    options: [
      {
        id: 'q4-a', label: 'Deep focus alone — hours of uninterrupted heads-down work',
        weights: {
          'software-engineering': 4, 'data-science': 4, 'ai-ml-research': 5,
          'technical-writing': 4, 'gate-prep': 4, 'ms-abroad': 3,
          'embedded-systems': 3, 'cybersecurity': 3,
        },
      },
      {
        id: 'q4-b', label: 'Mixed — some solo work, some team collaboration',
        weights: {
          'cloud-and-devops': 3, 'ui-ux-design': 3, 'game-development': 3,
          'product-management': 3, 'data-science': 2, 'blockchain-and-web3': 2,
          'finance-and-fpanda': 2,
        },
      },
      {
        id: 'q4-c', label: 'Mostly with people — meetings, calls, cross-team coordination',
        weights: {
          'product-management': 4, 'consulting': 5, 'sales-and-business-development': 5,
          'hr-and-people-ops': 5, 'digital-marketing': 3, 'mba-prep': 3,
          'investment-banking': 3,
        },
      },
    ],
  },

  {
    id: 'q5-risk',
    order: 5,
    question: 'What\'s your attitude toward career risk?',
    subtext: 'Imagine comparing two job offers.',
    type: 'single_select',
    options: [
      {
        id: 'q5-a', label: 'I want stability — a clear job profile at a known company',
        weights: {
          'gate-prep': 5, 'civil-and-infra': 4, 'mechanical-core': 4,
          'legal-and-compliance': 4, 'hr-and-people-ops': 3, 'finance-and-fpanda': 3,
          'supply-chain-and-operations': 3, 'ms-abroad': 2,
        },
      },
      {
        id: 'q5-b', label: 'Balanced — I want growth but not extreme uncertainty',
        weights: {
          'software-engineering': 3, 'data-science': 3, 'cloud-and-devops': 3,
          'consulting': 3, 'product-management': 3, 'investment-banking': 3,
          'mba-prep': 2, 'digital-marketing': 2,
        },
      },
      {
        id: 'q5-c', label: 'High risk, high reward — startup or building my own thing excites me',
        weights: {
          'entrepreneurship': 5, 'blockchain-and-web3': 4, 'sales-and-business-development': 3,
          'product-management': 2, 'digital-marketing': 3, 'game-development': 2,
        },
      },
    ],
  },

  {
    id: 'q6-activities',
    order: 6,
    question: 'Pick 2 activities you would genuinely enjoy doing in your free time:',
    type: 'multi_select',
    options: [
      {
        id: 'q6-coding', label: '💻 Building side projects or coding challenges',
        weights: {
          'software-engineering': 4, 'data-science': 2, 'game-development': 3,
          'blockchain-and-web3': 3, 'ai-ml-research': 3, 'cloud-and-devops': 2,
        },
      },
      {
        id: 'q6-design', label: '🎨 Sketching app wireframes or creating visual content',
        weights: {
          'ui-ux-design': 5, 'digital-marketing': 3, 'game-development': 2,
          'product-management': 1,
        },
      },
      {
        id: 'q6-finance', label: '📈 Reading finance news or analyzing stock markets',
        weights: {
          'investment-banking': 5, 'finance-and-fpanda': 5, 'mba-prep': 3,
          'consulting': 2, 'entrepreneurship': 2,
        },
      },
      {
        id: 'q6-hardware', label: '⚡ Tinkering with hardware, electronics, or 3D printing',
        weights: {
          'electronics-and-vlsi': 5, 'embedded-systems': 5, 'robotics': 5,
          'mechanical-core': 4, 'renewable-energy': 3,
        },
      },
      {
        id: 'q6-writing', label: '✍️ Writing blogs, docs, or research summaries',
        weights: {
          'technical-writing': 5, 'digital-marketing': 3, 'legal-and-compliance': 2,
          'consulting': 2,
        },
      },
      {
        id: 'q6-negotiating', label: '🤝 Pitching ideas or negotiating with people',
        weights: {
          'sales-and-business-development': 5, 'consulting': 4, 'mba-prep': 3,
          'entrepreneurship': 4, 'product-management': 2, 'investment-banking': 2,
        },
      },
      {
        id: 'q6-data', label: '📊 Exploring datasets or running experiments',
        weights: {
          'data-science': 5, 'ai-ml-research': 4, 'finance-and-fpanda': 3,
          'biotech-and-pharma': 3, 'supply-chain-and-operations': 2,
        },
      },
      {
        id: 'q6-leading', label: '👥 Organizing events or leading a team',
        weights: {
          'hr-and-people-ops': 5, 'product-management': 3, 'consulting': 2,
          'mba-prep': 3, 'entrepreneurship': 2,
        },
      },
      {
        id: 'q6-research', label: '🔬 Deep research papers or scientific journals',
        weights: {
          'ai-ml-research': 5, 'biotech-and-pharma': 5, 'gate-prep': 4,
          'ms-abroad': 4, 'renewable-energy': 3,
        },
      },
      {
        id: 'q6-security', label: '🛡️ Finding vulnerabilities or learning hacking ethically',
        weights: {
          'cybersecurity': 5, 'cloud-and-devops': 2, 'software-engineering': 1,
          'blockchain-and-web3': 2,
        },
      },
    ],
  },

  {
    id: 'q7-orientation',
    order: 7,
    question: 'Where do you see yourself in 8 years?',
    type: 'single_select',
    options: [
      {
        id: 'q7-a', label: 'A deep technical expert — Principal Engineer / Research Scientist',
        weights: {
          'software-engineering': 4, 'data-science': 4, 'ai-ml-research': 5,
          'cybersecurity': 4, 'electronics-and-vlsi': 4, 'embedded-systems': 4,
          'gate-prep': 3, 'ms-abroad': 3,
        },
      },
      {
        id: 'q7-b', label: 'A manager or director leading large cross-functional teams',
        weights: {
          'product-management': 4, 'mba-prep': 4, 'consulting': 4,
          'hr-and-people-ops': 4, 'supply-chain-and-operations': 3, 'investment-banking': 3,
        },
      },
      {
        id: 'q7-c', label: 'Running my own startup or freelancing independently',
        weights: {
          'entrepreneurship': 5, 'digital-marketing': 3, 'sales-and-business-development': 3,
          'blockchain-and-web3': 3, 'game-development': 2,
        },
      },
    ],
  },

  {
    id: 'q8-coding',
    order: 8,
    question: 'What\'s your current relationship with programming?',
    type: 'single_select',
    options: [
      {
        id: 'q8-a', label: 'I code regularly and enjoy building things with code',
        weights: {
          'software-engineering': 5, 'data-science': 3, 'cloud-and-devops': 4,
          'cybersecurity': 3, 'ai-ml-research': 4, 'game-development': 4,
          'blockchain-and-web3': 4, 'embedded-systems': 3, 'robotics': 3,
        },
      },
      {
        id: 'q8-b', label: 'I know basic coding but don\'t love spending all day on it',
        weights: {
          'product-management': 3, 'data-science': 2, 'ui-ux-design': 2,
          'digital-marketing': 2, 'finance-and-fpanda': 2, 'consulting': 2,
          'supply-chain-and-operations': 2,
        },
      },
      {
        id: 'q8-c', label: 'I have little or no programming background',
        weights: {
          'mba-prep': 3, 'consulting': 3, 'investment-banking': 3,
          'hr-and-people-ops': 4, 'legal-and-compliance': 4, 'digital-marketing': 3,
          'technical-writing': 3, 'sales-and-business-development': 3,
          'civil-and-infra': 3, 'mechanical-core': 4,
        },
      },
    ],
  },

  {
    id: 'q9-outcome',
    order: 9,
    question: 'What outcome matters most to you in your career?',
    type: 'single_select',
    options: [
      {
        id: 'q9-money', label: '💰 Maximize earnings as fast as possible',
        weights: {
          'investment-banking': 5, 'software-engineering': 4, 'consulting': 4,
          'mba-prep': 3, 'finance-and-fpanda': 3, 'sales-and-business-development': 3,
        },
      },
      {
        id: 'q9-stability', label: '🏛️ A stable, respected job with a clear career path',
        weights: {
          'gate-prep': 5, 'civil-and-infra': 4, 'mechanical-core': 4,
          'legal-and-compliance': 4, 'hr-and-people-ops': 3, 'ms-abroad': 3,
        },
      },
      {
        id: 'q9-creative', label: '🎨 Creative freedom and doing work I find meaningful',
        weights: {
          'ui-ux-design': 5, 'game-development': 4, 'technical-writing': 4,
          'digital-marketing': 3, 'entrepreneurship': 4, 'ai-ml-research': 2,
        },
      },
      {
        id: 'q9-impact', label: '🌍 Making a real social or scientific impact',
        weights: {
          'biotech-and-pharma': 5, 'renewable-energy': 5, 'ai-ml-research': 4,
          'robotics': 3, 'civil-and-infra': 3, 'hr-and-people-ops': 2,
        },
      },
    ],
  },

  {
    id: 'q10-abroad',
    order: 10,
    question: 'Are you open to relocating or studying/working abroad?',
    type: 'single_select',
    options: [
      {
        id: 'q10-a', label: 'Definitely — I\'d love to work or study in the US, Europe, or beyond',
        weights: {
          'ms-abroad': 5, 'software-engineering': 2, 'ai-ml-research': 3,
          'investment-banking': 2, 'consulting': 2,
        },
      },
      {
        id: 'q10-b', label: 'Maybe — open to it if the right opportunity comes',
        weights: {
          'mba-prep': 2, 'data-science': 1, 'cloud-and-devops': 1,
          'software-engineering': 1, 'consulting': 1,
        },
      },
      {
        id: 'q10-c', label: 'No — I want to build my career in India',
        weights: {
          'gate-prep': 3, 'civil-and-infra': 2, 'digital-marketing': 2,
          'sales-and-business-development': 2, 'hr-and-people-ops': 2,
          'entrepreneurship': 2,
        },
      },
    ],
  },
];

// ─── CAREER PATH DETAIL CONTENT ───────────────────────────────────────────────

const SOFTWARE_ENGINEERING = {
  slug: 'software-engineering',
  tagline: 'Build the systems the internet runs on',
  snapshot: {
    salaryRangeINR: { min: 400000, max: 2000000, note: 'Tier-2 college → service company → product startup range' },
    difficultyToBreakIn: 'Medium',
    bestFitTraits: ['Logical thinker', 'Patient debugger', 'Enjoys building', 'Self-learner'],
    idealFor: 'Students who love building things with code and want clear, measurable career growth',
  },
  roadmap: [
    {
      year: 1,
      focus: 'Foundations',
      learn: ['Python or C++ basics', 'Data Structures (arrays, linked lists, stacks, queues)', 'Git & GitHub', 'HTML/CSS basics'],
      build: ['Build a CLI calculator', 'A personal portfolio website', 'Solve 50 LeetCode Easy problems'],
      skip: ['Framework tutorials before knowing basics', 'Chasing trending tools before fundamentals'],
      milestone: 'Can write clean code in one language, understand core data structures, and use Git confidently',
    },
    {
      year: 2,
      focus: 'Depth & First Projects',
      learn: ['Algorithms (sorting, searching, dynamic programming)', 'DBMS & SQL', 'One backend framework (Node.js or Django)', 'REST APIs'],
      build: ['A full-stack CRUD app', 'Contribute to one open-source project', 'Build an API-powered mini-project'],
      skip: ['Learning multiple frameworks simultaneously', 'Skipping DSA for "just react tutorials"'],
      milestone: '1 full-stack project deployed + 100 LeetCode Medium problems solved',
    },
    {
      year: 3,
      focus: 'Interview Readiness & Internships',
      learn: ['System Design basics (HLD/LLD)', 'Advanced DSA', 'Computer Networks & OS concepts', 'Cloud basics (AWS/GCP free tier)'],
      build: ['Intern at a company (even small ones count)', 'Build a project that solves a real problem', 'Participate in a hackathon'],
      skip: ['Doing 10 certifications instead of building', 'Skipping behavioral interview prep'],
      milestone: '1 internship completed, resume has 3 real projects, 200+ DSA problems solved',
    },
    {
      year: 4,
      focus: 'Placement Sprint',
      learn: ['Company-specific prep (MAANG vs service company patterns)', 'Mock interviews', 'System design for senior roles'],
      build: ['Capstone project with full documentation', 'LinkedIn profile optimized', 'Referral network activated'],
      skip: ['Panic-switching to new technologies', 'Ignoring communication and soft skills'],
      milestone: 'Placed in a software role, minimum ₹4 LPA at worst case, ideally ₹8-12 LPA at product company',
    },
  ],
  skillTree: {
    foundational: ['Python/Java/C++', 'Arrays & Strings', 'Recursion', 'OOP concepts', 'SQL basics', 'Linux CLI'],
    intermediate: ['Trees & Graphs', 'Dynamic Programming', 'REST APIs', 'Git advanced', 'DBMS design', 'Docker basics'],
    advanced: ['System Design (HLD)', 'Microservices', 'Distributed systems', 'Message queues', 'Performance optimization'],
    mustHaveForInterviews: ['LeetCode 150 (NeetCode list)', 'SOLID principles', 'SQL joins + aggregations', 'Time & space complexity'],
  },
  realStories: [
    {
      name: 'Rahul S., VJTI Mumbai (Tier-2)',
      collegeType: 'State government college',
      summary: 'Didn\'t code until 2nd year. Started with YouTube tutorials, solved 300 LeetCode problems, landed an internship at a Pune startup, and got placed at Zomato at ₹16 LPA — all without a top-tier college name.',
    },
    {
      name: 'Anonymous, Pune engineering college',
      collegeType: 'Private Tier-3 college',
      summary: 'Joined a local web dev freelancing project in Semester 3. Built a track record of real clients, got a direct interview at a product company, placed at ₹9 LPA. "The internship mattered more than my CGPA."',
    },
  ],
  entryPoints: {
    hiringCompanies: ['TCS Digital', 'Infosys SP', 'Wipro Elite NTH', 'Capgemini', 'Persistent', 'Thoughtworks', 'Groww', 'Razorpay', 'Juspay', 'Postman', 'Freshworks'],
    onCampusVsOffCampus: 'On-campus: Service companies hire in bulk via mass drives. Product companies rarely come to Tier-2 campuses. Off-campus: Apply directly through referrals and LinkedIn; product companies like Juspay, Postman, and Razorpay actively hire off-campus.',
    referralTips: 'Connect with alumni 2-3 years senior to you on LinkedIn. A referral at Razorpay or Freshworks is worth 10x the job portal applications. Mention your specific project work, not just "looking for opportunities".',
  },
  commonMistakes: [
    'Starting with React before knowing JavaScript fundamentals',
    'Doing LeetCode without understanding the "why" — pattern recognition matters',
    'Having zero GitHub activity — recruiters check this',
    'Applying to only MAANG and ignoring product startups (much more realistic for Tier-2)',
    'Not doing internships because "CGPA isn\'t good enough" — just apply anyway',
  ],
  resources: {
    course: { title: 'CS50x by Harvard (free)', url: 'https://cs50.harvard.edu/x/' },
    book: { title: 'Cracking the Coding Interview — Gayle McDowell', url: '' },
    projectIdea: 'Build a personal finance tracker app with user authentication, expense categories, and monthly charts',
    community: { name: 'r/cscareerquestions + NeetCode Discord', url: 'https://discord.gg/neetcode' },
  },
  pivotOptions: ['data-science', 'cloud-and-devops', 'cybersecurity', 'ai-ml-research', 'product-management'],
  relatedPaths: ['cloud-and-devops', 'cybersecurity', 'game-development', 'blockchain-and-web3', 'embedded-systems'],
};

const DATA_SCIENCE = {
  slug: 'data-science',
  tagline: 'Turn raw data into decisions that shape companies',
  snapshot: {
    salaryRangeINR: { min: 450000, max: 1800000, note: 'Tier-2 → analytics role → data scientist range (India)' },
    difficultyToBreakIn: 'High',
    bestFitTraits: ['Curious about patterns', 'Comfortable with math', 'Enjoys storytelling with data', 'Patient with messy data'],
    idealFor: 'Students who enjoy statistics and want to combine coding with analytical problem-solving',
  },
  roadmap: [
    {
      year: 1,
      focus: 'Math & Python Foundations',
      learn: ['Python (NumPy, Pandas)', 'Descriptive Statistics', 'Linear Algebra basics', 'Probability fundamentals', 'Excel & basic SQL'],
      build: ['Explore one Kaggle beginner dataset', 'Reproduce a chart from a news article with Python', 'Build a simple grade calculator with Pandas'],
      skip: ['Deep learning before understanding linear regression', 'Skipping statistics for flashy ML libraries'],
      milestone: 'Can load, clean, and visualize a dataset with Python. Understands mean, median, variance, distributions.',
    },
    {
      year: 2,
      focus: 'Core ML & Projects',
      learn: ['Scikit-learn (regression, classification, clustering)', 'Feature Engineering', 'Model evaluation (train/test, cross-validation)', 'SQL intermediate (joins, window functions)', 'Data visualization (Matplotlib, Seaborn)'],
      build: ['End-to-end Kaggle competition entry', 'EDA on a public dataset with a published blog post', 'Predict something real (stock, weather, churn)'],
      skip: ['Using AutoML without understanding the underlying algorithm', 'Skipping EDA and jumping to model training'],
      milestone: '2 Kaggle notebooks published, 1 end-to-end ML project on GitHub',
    },
    {
      year: 3,
      focus: 'Deep Learning & Real-World Data',
      learn: ['Neural Networks (PyTorch or TensorFlow)', 'NLP basics (text classification, embeddings)', 'Computer Vision basics', 'MLOps & model deployment', 'Business acumen — understand the "so what"'],
      build: ['Deploy an ML model as a web API', 'Build an NLP classifier (sentiment, spam)', 'Intern at a data team (even in a small company)'],
      skip: ['Chasing every new model architecture', 'Building without connecting to a business problem'],
      milestone: '1 deployed ML product, 1 analytics internship or project with real business impact',
    },
    {
      year: 4,
      focus: 'Placement & Specialization',
      learn: ['Interview prep (case studies + statistics questions)', 'A/B testing & experimentation', 'Big Data basics (Spark, BigQuery) if targeting analytics at scale'],
      build: ['Portfolio with 3-5 polished projects with documented methodology', 'Published on LinkedIn or Medium'],
      skip: ['Over-engineering — simple models explained well beat complex models unexplained'],
      milestone: 'Placed in analytics/data science role. Entry roles include Business Analyst, Data Analyst, Junior Data Scientist.',
    },
  ],
  skillTree: {
    foundational: ['Python', 'Pandas & NumPy', 'SQL (intermediate)', 'Basic statistics', 'Matplotlib/Seaborn'],
    intermediate: ['Scikit-learn', 'Feature Engineering', 'Model evaluation', 'Jupyter notebooks', 'Git'],
    advanced: ['PyTorch/TensorFlow', 'MLOps & deployment', 'NLP', 'A/B testing', 'PySpark basics'],
    mustHaveForInterviews: ['SQL window functions', 'Probability & Bayes theorem', 'Explain bias-variance tradeoff', 'Linear regression from scratch'],
  },
  realStories: [
    {
      name: 'Priya M., Nagpur engineering college',
      collegeType: 'Private Tier-2 college',
      summary: 'Started with a Coursera ML course in Year 2, built an AQI prediction project using public government data. Got selected for a data analyst role at Meesho after 3 failed interviews at service companies. "Getting rejected taught me what gaps I had."',
    },
    {
      name: 'Anonymous, JNTU affiliated college',
      collegeType: 'Affiliated state university college',
      summary: 'No CS background (ECE branch). Learned Python and SQL independently. Built a retail demand forecasting project. Placed at Flipkart\'s supply chain analytics team at ₹12 LPA in placement season.',
    },
  ],
  entryPoints: {
    hiringCompanies: ['Flipkart', 'Meesho', 'PhonePe', 'Swiggy', 'CRED', 'MuSigma', 'Fractal Analytics', 'Tiger Analytics', 'Accenture Analytics', 'TCS Analytics'],
    onCampusVsOffCampus: 'Analytics firms like MuSigma and Fractal do campus visits at select colleges. Most product company data roles are off-campus. Apply through LinkedIn, Instahyre, and AngelList.',
    referralTips: 'Target data analysts 1-2 years at your target company. Describe your specific project: "I built a churn prediction model with 87% accuracy on a retail dataset" beats "interested in data science roles".',
  },
  commonMistakes: [
    'Learning 5 tools shallowly instead of mastering Python and SQL deeply',
    'Projects with no business context — models need to solve something real',
    'Avoiding statistics — interviewers always test it',
    'Not deploying models — a Streamlit app matters more than a Jupyter notebook',
    'Confusing data analyst, data scientist, and ML engineer — apply to the right role',
  ],
  resources: {
    course: { title: 'fast.ai Practical Deep Learning (free)', url: 'https://course.fast.ai/' },
    book: { title: 'Hands-On ML with Scikit-Learn, Keras & TensorFlow — Aurélien Géron', url: '' },
    projectIdea: 'Build an IPL win predictor using historical match data — deploy with Streamlit, share on LinkedIn',
    community: { name: 'r/datascience + Kaggle forums', url: 'https://www.kaggle.com/discussions' },
  },
  pivotOptions: ['ai-ml-research', 'software-engineering', 'finance-and-fpanda', 'product-management'],
  relatedPaths: ['ai-ml-research', 'software-engineering', 'consulting', 'finance-and-fpanda'],
};

const PRODUCT_MANAGEMENT = {
  slug: 'product-management',
  tagline: 'Shape what millions of people use every day',
  snapshot: {
    salaryRangeINR: { min: 600000, max: 2500000, note: 'Associate PM → PM range. Typically requires 1-3 years of prior experience in engineering/design/analytics.' },
    difficultyToBreakIn: 'High',
    bestFitTraits: ['Empathetic listener', 'Data-driven decision maker', 'Strong communicator', 'Comfortable with ambiguity'],
    idealFor: 'Students who want to lead products without managing code, sitting at the intersection of user, business, and tech',
  },
  roadmap: [
    {
      year: 1,
      focus: 'Build Context & Curiosity',
      learn: ['What is a PRD, user story, and sprint', 'Basics of UX: user interviews, wireframing', 'SQL basics (PMs use data all the time)', 'Tech literacy: APIs, databases, frontend vs backend'],
      build: ['Deconstruct 3 apps you use daily (why did they make this decision?)', 'Conduct 5 user interviews about any problem', 'Write a feature proposal for an app improvement'],
      skip: ['Chasing PM internships in Year 1 — nobody hires PMs that early', 'Reading 10 PM books without applying anything'],
      milestone: 'Can write a clear 1-page PRD, knows how to conduct a user interview, understands product metrics',
    },
    {
      year: 2,
      focus: 'Product Sense & Analytical Skills',
      learn: ['Product metrics: DAU, retention, NPS, ARPU', 'A/B testing fundamentals', 'Competitor analysis frameworks', 'SQL for product analysis', 'Figma basics for wireframing'],
      build: ['Build a product case study around a real problem you face', 'Participate in a product hackathon (Product Space, ProdGrad)', 'Create a clickable Figma prototype'],
      skip: ['Being too technical — product is about users, not code', 'Ignoring business models and revenue levers'],
      milestone: '1 published product case study, 1 hackathon or competition participated in',
    },
    {
      year: 3,
      focus: 'Internships & Specialization',
      learn: ['Go-to-market strategy basics', 'Growth loops and virality', 'Stakeholder management', 'Presentation and storytelling'],
      build: ['APM or product intern role (Summer)', 'Build a full product tear-down: user personas + journey + metrics + roadmap recommendation'],
      skip: ['Applying to full PM roles without any work experience', 'Skipping the "why should this be built?" question'],
      milestone: '1 PM or adjacent internship (growth, operations, business analyst, or UX)', 
    },
    {
      year: 4,
      focus: 'APM Applications & Portfolio',
      learn: ['PM interview frameworks (CIRCLES, STAR, root cause analysis)', 'Behavioral prep', 'Company-specific product research'],
      build: ['Portfolio with 3-5 polished case studies', 'Network with PMs at your target companies on LinkedIn'],
      skip: ['Applying without research on the company\'s product strategy', 'Ignoring the "failure" question — it\'s always asked'],
      milestone: 'Placed in APM, Business Analyst, or Growth role. Pure PM roles are rare for freshers — adjacent roles convert.',
    },
  ],
  skillTree: {
    foundational: ['User research methods', 'PRD writing', 'Product metrics (AARRR)', 'SQL basics', 'Wireframing'],
    intermediate: ['A/B testing', 'Competitive analysis', 'Roadmap prioritization (RICE, ICE)', 'Stakeholder management', 'Go-to-market basics'],
    advanced: ['Growth loops', 'Platform product strategy', 'Pricing strategy', 'OKR setting', 'Data-driven experimentation'],
    mustHaveForInterviews: ['Framework for "design a product" questions', 'Metrics for "how would you measure success"', 'Root cause analysis for "metrics dropped" scenarios'],
  },
  realStories: [
    {
      name: 'Akash T., Jaipur engineering college',
      collegeType: 'Private Tier-2 college',
      summary: 'Started with a Business Analyst role after college. Published PM case studies on LinkedIn, participated in ProductSpace challenges. Got his first PM role at a B2B SaaS startup after 14 months. "No one hires a fresher PM — get a BA or analyst role first."',
    },
    {
      name: 'Anonymous, Delhi University affiliated college',
      collegeType: 'Affiliated state university',
      summary: 'Non-engineering background. Did a Postman PM fellowship, built strong case study portfolio. Placed as Growth Analyst at an EdTech startup. Transitioned to PM in 1.5 years. "PM is a muscle you build in adjacent roles."',
    },
  ],
  entryPoints: {
    hiringCompanies: ['Razorpay APM', 'Postman PM Fellowship', 'Microsoft APM', 'Google APM (very competitive)', 'Juspay PM', 'BrowserStack', 'Leadsquared', 'Darwinbox', 'Clevertap'],
    onCampusVsOffCampus: 'APM programs at MAANG don\'t visit Tier-2 campuses. Off-campus is the primary path. Apply directly, leverage PM-specific communities, and target startups willing to hire analytical freshers.',
    referralTips: 'PMs value specific, problem-centric outreach. "I built a case study on your subscription pricing model — I noticed X and think Y could improve retention. Happy to share?" This gets replies. Generic "I\'m interested in PM" gets ignored.',
  },
  commonMistakes: [
    'Trying to land a PM role as a fresher — start with BA, growth, or ops',
    'Generic case studies — "redesign Uber" without a fresh angle is noise',
    'Skipping SQL and data — every PM interview includes metrics questions',
    'Not using the product you\'re interviewing for deeply',
    'Over-focusing on frameworks — interviewers want structured thinking, not templates',
  ],
  resources: {
    course: { title: 'Reforge / ProductSpace PM curriculum', url: 'https://productspace.in/' },
    book: { title: 'Inspired: How to Create Tech Products Customers Love — Marty Cagan', url: '' },
    projectIdea: 'Pick a feature gap in an Indian super-app (Swiggy, PhonePe, Juspay) and write a full PRD: problem, user persona, success metrics, and 3-sprint roadmap',
    community: { name: 'ProductSpace India community', url: 'https://productspace.in/' },
  },
  pivotOptions: ['software-engineering', 'data-science', 'consulting', 'entrepreneurship', 'mba-prep'],
  relatedPaths: ['data-science', 'ui-ux-design', 'consulting', 'entrepreneurship'],
};

// Placeholder for remaining 26 paths — minimal snapshot so pages work
const PLACEHOLDER_PATHS = [
  { slug: 'ui-ux-design', tagline: 'Design digital experiences people actually enjoy', snapshot: { difficultyToBreakIn: 'Medium', bestFitTraits: ['Visual thinker', 'Empathetic', 'Detail-oriented'] } },
  { slug: 'cybersecurity', tagline: 'Protect systems that the digital world depends on', snapshot: { difficultyToBreakIn: 'High', bestFitTraits: ['Analytical', 'Curious hacker mindset', 'Methodical'] } },
  { slug: 'cloud-and-devops', tagline: 'Build the infrastructure that scales every product', snapshot: { difficultyToBreakIn: 'Medium', bestFitTraits: ['Loves automation', 'Systems thinker', 'Detail-oriented'] } },
  { slug: 'mechanical-core', tagline: 'Design machines and systems that shape the physical world', snapshot: { difficultyToBreakIn: 'Medium', bestFitTraits: ['Problem solver', 'Strong in physics', 'Hands-on learner'] } },
  { slug: 'electronics-and-vlsi', tagline: 'Engineer the chips and circuits the tech world is built on', snapshot: { difficultyToBreakIn: 'High', bestFitTraits: ['Math comfort', 'Patient', 'Detail-oriented'] } },
  { slug: 'civil-and-infra', tagline: 'Build the infrastructure that holds society together', snapshot: { difficultyToBreakIn: 'Low', bestFitTraits: ['Loves structures', 'Practical thinker', 'Stable career seeker'] } },
  { slug: 'consulting', tagline: 'Solve complex business problems for top companies', snapshot: { difficultyToBreakIn: 'High', bestFitTraits: ['Sharp communicator', 'Loves frameworks', 'Adaptable'] } },
  { slug: 'investment-banking', tagline: 'Drive the deals that reshape industries and markets', snapshot: { difficultyToBreakIn: 'High', bestFitTraits: ['Excel wizard', 'High pressure tolerance', 'Finance-obsessed'] } },
  { slug: 'mba-prep', tagline: 'Unlock management roles and leadership tracks with an MBA', snapshot: { difficultyToBreakIn: 'Medium', bestFitTraits: ['Ambitious', 'People-oriented', 'Strategic thinker'] } },
  { slug: 'gate-prep', tagline: 'Enter top PSUs and research institutions through GATE', snapshot: { difficultyToBreakIn: 'Medium', bestFitTraits: ['Strong academics', 'Structured learner', 'Prefers stability'] } },
  { slug: 'ms-abroad', tagline: 'Access global research and top tech companies with an MS degree', snapshot: { difficultyToBreakIn: 'High', bestFitTraits: ['Research-inclined', 'Strong academics', 'International mindset'] } },
  { slug: 'entrepreneurship', tagline: 'Build something from zero — your own product and company', snapshot: { difficultyToBreakIn: 'Low', bestFitTraits: ['Risk-tolerant', 'Self-starter', 'Customer-obsessed'] } },
  { slug: 'game-development', tagline: 'Create the worlds, characters, and mechanics players love', snapshot: { difficultyToBreakIn: 'Medium', bestFitTraits: ['Creative coder', 'Gaming enthusiast', 'Persistent'] } },
  { slug: 'digital-marketing', tagline: 'Grow brands and drive revenue through digital channels', snapshot: { difficultyToBreakIn: 'Low', bestFitTraits: ['Creative', 'Data-curious', 'Trend-aware'] } },
  { slug: 'finance-and-fpanda', tagline: 'Steer company strategy through financial planning and analysis', snapshot: { difficultyToBreakIn: 'Medium', bestFitTraits: ['Excel power user', 'Analytical', 'Business-minded'] } },
  { slug: 'supply-chain-and-operations', tagline: 'Make sure the right thing arrives at the right place at the right time', snapshot: { difficultyToBreakIn: 'Low', bestFitTraits: ['Process thinker', 'Data-driven', 'Practical'] } },
  { slug: 'robotics', tagline: 'Program the machines that will change how work gets done', snapshot: { difficultyToBreakIn: 'High', bestFitTraits: ['Hardware + software blend', 'Creative engineer', 'Persistent'] } },
  { slug: 'ai-ml-research', tagline: 'Push the frontier of what machines can learn and do', snapshot: { difficultyToBreakIn: 'High', bestFitTraits: ['Math-heavy', 'Research-oriented', 'Deep thinker'] } },
  { slug: 'embedded-systems', tagline: 'Code the firmware that powers every smart device', snapshot: { difficultyToBreakIn: 'High', bestFitTraits: ['Hardware-aware', 'Loves low-level', 'Methodical'] } },
  { slug: 'blockchain-and-web3', tagline: 'Build the decentralized internet layer by layer', snapshot: { difficultyToBreakIn: 'Medium', bestFitTraits: ['Crypto-curious', 'Systems thinker', 'Early adopter'] } },
  { slug: 'technical-writing', tagline: 'Make complex technology legible for every audience', snapshot: { difficultyToBreakIn: 'Low', bestFitTraits: ['Clear communicator', 'Detail-oriented', 'Tech-savvy'] } },
  { slug: 'sales-and-business-development', tagline: 'Close deals and open doors for high-growth companies', snapshot: { difficultyToBreakIn: 'Low', bestFitTraits: ['People person', 'Persuasive', 'Goal-driven'] } },
  { slug: 'hr-and-people-ops', tagline: 'Shape the culture and talent strategy of organizations', snapshot: { difficultyToBreakIn: 'Low', bestFitTraits: ['Empathetic', 'Organized', 'Strong communicator'] } },
  { slug: 'legal-and-compliance', tagline: 'Navigate the regulations that govern business and technology', snapshot: { difficultyToBreakIn: 'Medium', bestFitTraits: ['Structured thinker', 'Detail-obsessed', 'Ethical compass'] } },
  { slug: 'biotech-and-pharma', tagline: 'Apply biology and engineering to solve healthcare challenges', snapshot: { difficultyToBreakIn: 'High', bestFitTraits: ['Science-curious', 'Patient researcher', 'Analytical'] } },
  { slug: 'renewable-energy', tagline: 'Engineer the clean energy systems the planet urgently needs', snapshot: { difficultyToBreakIn: 'Medium', bestFitTraits: ['Mission-driven', 'Systems thinker', 'Technically grounded'] } },
];

// ─── SEED RUNNER ──────────────────────────────────────────────────────────────

async function run() {
  await connectDB();

  // 1. Seed quiz questions
  let qSeeded = 0;
  for (const q of QUIZ_QUESTIONS) {
    const exists = await QuizQuestion.findOne({ id: q.id });
    if (!exists) {
      await QuizQuestion.create(q);
      qSeeded++;
    }
  }
  console.log(`✅ Quiz questions: ${qSeeded} added (${QUIZ_QUESTIONS.length - qSeeded} already existed)`);

  // 2. Upsert full content for reference career paths
  const FULL_PATHS = [SOFTWARE_ENGINEERING, DATA_SCIENCE, PRODUCT_MANAGEMENT];
  for (const data of FULL_PATHS) {
    const { slug, ...fields } = data;
    const updated = await CareerPath.findOneAndUpdate(
      { slug },
      { $set: fields },
      { new: true }
    );
    if (updated) {
      console.log(`   ✅ Updated full content: ${slug}`);
    } else {
      console.log(`   ⚠️  Career path not found in DB: ${slug} (run seedRoadmap.js first)`);
    }
  }

  // 3. Upsert placeholder content for remaining paths
  let phSeeded = 0;
  for (const ph of PLACEHOLDER_PATHS) {
    const { slug, ...fields } = ph;
    const existing = await CareerPath.findOne({ slug });
    if (existing) {
      // Only set placeholder fields if the rich content is still empty
      if (!existing.tagline) {
        await CareerPath.findOneAndUpdate({ slug }, { $set: fields });
        phSeeded++;
      }
    } else {
      console.log(`   ⚠️  Career path not found in DB: ${slug} (run seedRoadmap.js first)`);
    }
  }
  console.log(`✅ Placeholder content: ${phSeeded} paths initialized`);

  await mongoose.connection.close();
  console.log('✅ Seed complete.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

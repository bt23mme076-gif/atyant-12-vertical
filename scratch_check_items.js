import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function checkDb() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB');

  const { CareerPathItem } = await import('./src/models/CareerPathItem.js');
  const items = await CareerPathItem.find().lean();
  console.log('CareerPathItems:', JSON.stringify(items, null, 2));

  await mongoose.disconnect();
}

checkDb().catch(console.error);

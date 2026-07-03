import { Batch } from '../models/Batch.js';

// Returns the id of the currently open cohort, creating a default one on
// first run so signups never fail even before an admin/seed script has
// configured a batch.
export async function assignActiveBatch() {
  let batch = await Batch.findOne({ isActive: true }).sort({ startDate: -1 });
  if (!batch) {
    batch = await Batch.create({
      name: 'Founding Cohort',
      code: 'FOUNDING',
      description: 'The first cohort of students on the Atyant Roadmap.',
      isActive: true,
    });
  }
  return batch._id;
}

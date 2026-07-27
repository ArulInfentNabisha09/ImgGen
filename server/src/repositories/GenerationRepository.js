const db = require('../../database/connection');

class GenerationRepository {
  /**
   * Creates a new generation job record
   */
  async createJob(data) {
    const [id] = await db('generations')
      .insert({
        prompt: data.prompt,
        input_image_paths: data.input_image_paths,
        total_images: data.total_images,
        status: 'pending',
      })
      .returning('id');
    return id.id || id; // Knex returning behavior varies slightly by dialect, this handles pg
  }

  /**
   * Updates the status of an existing job
   */
  async updateJobStatus(id, status, updates = {}) {
    await db('generations')
      .where({ id })
      .update({
        status,
        ...updates,
        updated_at: db.fn.now(),
      });
  }
}

module.exports = new GenerationRepository();

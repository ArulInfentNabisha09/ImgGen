/**
 * JobStore.js
 * Simple in-memory job store for tracking Instagram redesign progress.
 * Each job has an ID, status, steps, and result.
 */

const { EventEmitter } = require('events');

class JobStore extends EventEmitter {
  constructor() {
    super();
    this.jobs = new Map();
  }

  /** Create a new job and return its ID */
  create(jobId) {
    const job = {
      id: jobId,
      status: 'pending',  // pending | running | done | error
      steps: [],
      result: null,
      error: null,
      createdAt: Date.now()
    };
    this.jobs.set(jobId, job);
    return job;
  }

  /** Get a job by ID */
  get(jobId) {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Add a step update to a job and emit a 'update' event.
   * @param {string} jobId
   * @param {object} step - { id, label, status, detail? }
   *   status: 'pending' | 'active' | 'done' | 'warning' | 'error'
   */
  updateStep(jobId, step) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const existing = job.steps.find(s => s.id === step.id);
    if (existing) {
      Object.assign(existing, step);
    } else {
      job.steps.push(step);
    }

    this.emit('update', jobId, job);
  }

  /** Mark job as complete with result */
  complete(jobId, result) {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.status = 'done';
    job.result = result;
    this.emit('update', jobId, job);

    // Clean up after 10 minutes
    setTimeout(() => this.jobs.delete(jobId), 10 * 60 * 1000);
  }

  /** Mark job as failed */
  fail(jobId, errorMessage) {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.status = 'error';
    job.error = errorMessage;
    this.emit('update', jobId, job);

    setTimeout(() => this.jobs.delete(jobId), 5 * 60 * 1000);
  }
}

// Singleton instance shared across the app
module.exports = new JobStore();

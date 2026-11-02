export const SRS = {
  review(card, quality) {
    card = card || { ef: 2.5, reps: 0, interval: 0, due: 0 };
    let ef = card.ef, reps = card.reps, interval = card.interval;
    let newEf = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (newEf < 1.3) newEf = 1.3;

    let newReps, newInterval;
    if (quality < 3) {
      newReps = 0;
      newInterval = 1;
    } else {
      newReps = reps + 1;
      if (reps === 0) newInterval = 1;
      else if (reps === 1) newInterval = 6;
      else newInterval = Math.round(interval * newEf);
    }
    return {
      ef: +newEf.toFixed(2),
      reps: newReps,
      interval: newInterval,
      lastReview: Date.now(),
      due: Date.now() + newInterval * 86400000
    };
  },
  isDue(card, now = Date.now()) {
    return !card || !card.due || card.due <= now;
  }
};
export const performanceMonitor = {
  markFeature: (name: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark(name);
    }
  },

  measureFeature: (name: string, startMark: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      try {
        performance.measure(name, startMark);
        const measure = performance.getEntriesByName(name)[0];

        if (measure) {
          console.log(`${name}: ${measure.duration.toFixed(2)}ms`);

          // Send to analytics in production
          if (import.meta.env.PROD) {
            // analytics.track('performance', { name, duration: measure.duration });
          }
        }
      } catch (error) {
        console.warn(`Performance measurement failed for ${name}:`, error);
      }
    }
  },

  clearMarks: (name?: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      if (name) {
        performance.clearMarks(name);
      } else {
        performance.clearMarks();
      }
    }
  },
};


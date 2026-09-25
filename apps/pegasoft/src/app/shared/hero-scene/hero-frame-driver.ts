export type HeroFrameLoop = 'always' | 'demand' | 'never';
type FrameAdapter<T> = {
  getLoop: () => HeroFrameLoop;
  setLoop: (loop: HeroFrameLoop) => void;
  elapsedSeconds: () => number;
  advance: (absoluteSeconds: number) => void;
  read: () => T;
};
/** Development input transport: owns only frame scheduling, never scene outputs. */
export function createHeroFrameDriver<T>(adapter: FrameAdapter<T>) {
  const originalLoop = adapter.getLoop();
  let disposed = false;
  const inputs: Array<{ kind: 'frame'; deltaSeconds: number }> = [];
  const resume = () => adapter.setLoop(originalLoop);
  return {
    get inputs() {
      return structuredClone(inputs);
    },
    pause: () => {
      if (disposed) throw new Error('Frame driver is disposed');
      adapter.setLoop('never');
    },
    advance: (deltaSeconds: number) => {
      try {
        if (disposed) throw new Error('Frame driver is disposed');
        if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0)
          throw new Error('Frame delta must be finite and nonnegative');
        if (adapter.getLoop() !== 'never') adapter.setLoop('never');
        inputs.push({ kind: 'frame', deltaSeconds });
        adapter.advance(adapter.elapsedSeconds() + deltaSeconds);
        return adapter.read();
      } catch (error) {
        resume();
        throw error;
      }
    },
    resume,
    dispose: () => {
      resume();
      disposed = true;
    },
  };
}

import { GracefulShutdownService } from '../services/graceful-shutdown.service';

export function ShutdownTrackedTask(taskName?: string): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;

    if (typeof originalMethod !== 'function') {
      return descriptor;
    }

    const wrapped = async function (this: unknown, ...args: unknown[]) {
      const resolvedTaskName =
        taskName ?? `${target.constructor.name}.${String(propertyKey)}`;

      return GracefulShutdownService.runTrackedTask(resolvedTaskName, () =>
        Promise.resolve(originalMethod.apply(this, args)),
      );
    };

    descriptor.value = wrapped as typeof originalMethod;

    return descriptor;
  };
}

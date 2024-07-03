import { z } from "zod";

export const zodLoginEvent = z.tuple([
  z.object({
    username: z.string(),
  }),
]);

export type SocketIoServerListenEvents = {
  join: UnhandledCallback<ReturnType<typeof handleEvent<typeof zodLoginEvent>>>;
};

export function handleEvent<T extends z.ZodType<unknown[]>>(
  zodType: T,
  callback: (...data: z.infer<T>) => void,
): UnhandledCallback<(...data: z.infer<T>) => void> {
  return ((...data: unknown[]) => {
    const parsedData = zodType.safeParse(data);

    if (parsedData.success) {
      callback(...parsedData.data);
    } else {
      console.error("Error parsing data", parsedData.error.errors);
    }
  }) as UnhandledCallback<(...data: z.infer<T>) => void>;
}

type UnhandledCallback<T> = T & "unhandled";

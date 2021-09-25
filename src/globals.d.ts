declare type Callback<T = undefined, E = Error> = (
  err: E | null,
  data: T
) => void;

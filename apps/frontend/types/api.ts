export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: string; code?: number };
export type ApiResponse<T> = ApiOk<T> | ApiErr;

export const isOk = <T,>(r: ApiResponse<T>): r is ApiOk<T> => r.ok === true;

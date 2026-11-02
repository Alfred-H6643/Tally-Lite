/** 從 catch 到的未知錯誤取出可顯示的訊息 */
export const getErrorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);

export type UnityInstance = {
    SendMessage: (
    gameObject: string,
    method: string,
    value?: string | number | boolean
    ) => void;
};

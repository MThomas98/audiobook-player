export interface Api
{
    selectFolder(): Promise<string | null>;
}

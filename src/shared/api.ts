export interface FolderContents
{
    folderPath: string;
    files: string[];
}

export interface Api
{
    selectFolder(): Promise<FolderContents | null>;
}

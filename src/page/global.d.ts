import type { Api } from "../shared/api";

import "react";

declare global
{
    interface Window {
        api: Api;
    }
}

declare module "react"
{
    interface CSSProperties
    {
        [key: `--${string}`]: string | number;
    }
}

import { app, setupApp } from "../server/app";

export default async function handler(req: any, res: any) {
    await setupApp();
    app(req, res);
}

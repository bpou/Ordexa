import type { NextApiRequest, NextApiResponse } from "next";
import { getFortnoxAccessToken, listFortnoxCustomers } from "@/lib/fortnox";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Försök bara att hämta en token
    const tokenInfo = await getFortnoxAccessToken();
    console.log("AccessToken OK", tokenInfo);

    // Testa gärna en enkel endpoint, t.ex. customers
    const customers = await listFortnoxCustomers({ limit: 1 });
    res.status(200).json({ ok: true, tokenInfo, customers });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
}

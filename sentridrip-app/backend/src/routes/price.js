import { Router } from "express";
import { getSolPrice, getPriceHistory } from "../services/priceService.js";

const router = Router();

router.get("/sol", async (req, res) => {
  try {
    const price = await getSolPrice();
    res.json({ success: true, data: { token: "SOL", price, currency: "USD", timestamp: new Date().toISOString() } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/history", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 60;
    const history = await getPriceHistory(limit);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

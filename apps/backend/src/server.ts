import app from './app';
import { env } from './config/env';

const PORT = parseInt(env.PORT, 10) || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Vridhi ERP Backend running on http://localhost:${PORT}`);
});

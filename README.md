<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# NEXUS // SWARM - Quantum Net

**Autonomous Neural Trading Execution Layer** - AI-powered cryptocurrency trading bot swarm simulator with real-time market data integration.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF.svg)](https://vitejs.dev/)

## 🌟 Features

- **4 AI Trading Bots** with unique strategies and personalities
- **Real-time Market Data** from Binance API
- **Live Trading Simulation** with leverage, TP/SL, and trailing stops
- **Leaderboard System** tracking performance metrics
- **News Integration** affecting trading decisions
- **Responsive Design** optimized for all devices
- **Local Storage Persistence** for trading history

## 🤖 Trading Bots

1. **Sebastian** - Macro Futures (Daily Golden Cross Strategy)
2. **Chloe** - Fibonacci Macro Expansion (Weekly Swing Trading)
3. **Dr. Adrian** - Quant Futures (4H Volatility Analysis)
4. **Goldy Roger** - Institutional Supply/Demand (Gold/PAXG Specialist)

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (recommended: 20+)
- **npm** or **yarn** package manager

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/nexus-swarm.git
   cd nexus-swarm
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment.

### Preview Production Build

```bash
npm run preview
```

## 📦 Deployment

### GitHub Pages

1. **Update `vite.config.ts`** with your repository name:
   ```typescript
   export default defineConfig({
     base: '/nexus-swarm/', // Replace with your repo name
     // ... rest of config
   });
   ```

2. **Install GitHub Pages plugin (optional):**
   ```bash
   npm install --save-dev gh-pages
   ```

3. **Add deploy script to `package.json`:**
   ```json
   "scripts": {
     "deploy": "npm run build && gh-pages -d dist"
   }
   ```

4. **Deploy:**
   ```bash
   npm run deploy
   ```

### Vercel / Netlify

1. **Connect your GitHub repository** to Vercel/Netlify
2. **Build command:** `npm run build`
3. **Output directory:** `dist`
4. **Deploy automatically** on every push to main branch

### Other Platforms

The `dist` folder contains static files that can be deployed to any static hosting service:
- AWS S3 + CloudFront
- Firebase Hosting
- Cloudflare Pages
- Any web server

## 🛠️ Technology Stack

- **React 19.2** - UI Framework
- **TypeScript 5.8** - Type Safety
- **Vite 6.2** - Build Tool
- **Tailwind CSS** - Styling (via CDN)
- **Lucide React** - Icons
- **Binance API** - Market Data

## 📁 Project Structure

```
nexus-swarm/
├── components/          # React components
│   ├── BotCard.tsx
│   ├── BotDetailModal.tsx
│   ├── LogPanel.tsx
│   └── PredictionChart.tsx
├── App.tsx             # Main application component
├── index.tsx           # Entry point
├── index.html          # HTML template
├── types.ts            # TypeScript type definitions
├── constants.ts        # Configuration and constants
├── vite.config.ts      # Vite configuration
├── tsconfig.json       # TypeScript configuration
└── package.json        # Dependencies and scripts
```

## ⚙️ Configuration

### Environment Variables (Optional)

Create a `.env.local` file for API keys (if needed in future):

```env
GEMINI_API_KEY=your_api_key_here
```

**Note:** Currently, the app uses public Binance API endpoints and doesn't require API keys for basic functionality.

## 🎮 Usage

1. **Start the Swarm:** Click the "EXECUTE" button to activate all trading bots
2. **Monitor Performance:** View real-time trading activity in the logs panel
3. **Check Leaderboards:** Track which bots are performing best
4. **View Details:** Click on any bot card to see detailed statistics
5. **Manual Control:** Force close positions using the X button in the order book

## 📊 Features Explained

- **Real-time Market Data:** Fetches live prices from Binance every 3 seconds
- **Smart Trading Logic:** Each bot uses technical indicators (RSI, EMA, Bollinger Bands, ATR)
- **Risk Management:** Dynamic TP/SL based on ATR, trailing stops, liquidation protection
- **News Integration:** Market news affects trading decisions
- **Persistence:** All trading data saved to browser localStorage

## 🔒 Security Note

⚠️ **This is a simulation/trading simulator.** No real money is involved. The app uses public market data APIs and simulates trading for educational purposes only.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Binance API for market data
- Lucide for beautiful icons
- Tailwind CSS for styling utilities
- React and Vite teams for amazing tools

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Made with ❤️ for the crypto trading community**

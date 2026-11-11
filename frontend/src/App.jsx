import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { ThemeProvider } from './context/ThemeContext';
import AnimatedBackground from './components/AnimatedBackground';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Footer from './components/Footer';

import OverviewScreen from './screens/OverviewScreen';
import ForecastStudioScreen from './screens/ForecastStudioScreen';
import InventoryBoardScreen from './screens/InventoryBoardScreen';
import SentimentLabScreen from './screens/SentimentLabScreen';
import PricingDeskScreen from './screens/PricingDeskScreen';

import { api } from './services/api';

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState('overview');
  const [collapsed, setCollapsed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [badges, setBadges] = useState({ stockoutRisks: 0, pendingApprovals: 0 });

  const refreshBadgeCounts = async () => {
    try {
      const kpiRes = await api.getKpis();
      if (kpiRes && kpiRes.kpis) {
        setBadges({
          stockoutRisks: kpiRes.kpis.stockout_risk_products ?? 0,
          pendingApprovals: kpiRes.kpis.pending_approvals ?? 0,
        });
      }
    } catch (err) {
      console.warn('Failed to fetch badge counts:', err);
    }
  };

  useEffect(() => {
    refreshBadgeCounts();
  }, []);

  const handleGlobalRefresh = async () => {
    setIsRefreshing(true);
    await refreshBadgeCounts();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const getScreenDetails = () => {
    switch (currentScreen) {
      case 'forecast':
        return {
          title: 'Forecast Studio',
          subtitle: 'Demand projection: Moving Average baseline vs Gradient-Boosting comparison',
        };
      case 'inventory':
        return {
          title: 'Inventory Board',
          subtitle: 'Stock velocity, safety buffer thresholds, and replenishment lead times',
        };
      case 'sentiment':
        return {
          title: 'Sentiment Lab',
          subtitle: 'VADER NLP polarity analytics & customer review perception mapping',
        };
      case 'pricing':
        return {
          title: 'Pricing Desk',
          subtitle: 'Explainable AI price optimization clamped between product cost floors and ceilings',
        };
      default:
        return {
          title: 'Executive Overview',
          subtitle: 'Catalog demand forecast, inventory position, and real-time pricing signals',
        };
    }
  };

  const screenDetails = getScreenDetails();

  const pageVariants = {
    initial: {
      opacity: 0,
      y: 8,
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.25,
        ease: [0.16, 1, 0.3, 1],
      },
    },
    exit: {
      opacity: 0,
      y: -8,
      transition: {
        duration: 0.15,
        ease: 'easeIn',
      },
    },
  };

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 flex overflow-x-hidden transition-colors duration-200">
      <AnimatedBackground />

      <Sidebar
        currentScreen={currentScreen}
        setCurrentScreen={setCurrentScreen}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        badges={badges}
      />

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <Header
          title={screenDetails.title}
          subtitle={screenDetails.subtitle}
          onRefresh={handleGlobalRefresh}
          isRefreshing={isRefreshing}
        />

        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScreen}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full"
            >
              {currentScreen === 'overview' && (
                <OverviewScreen onNavigate={(screen) => setCurrentScreen(screen)} />
              )}
              {currentScreen === 'forecast' && <ForecastStudioScreen />}
              {currentScreen === 'inventory' && <InventoryBoardScreen />}
              {currentScreen === 'sentiment' && <SentimentLabScreen />}
              {currentScreen === 'pricing' && (
                <PricingDeskScreen onDecisionRecorded={refreshBadgeCounts} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        <Footer />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

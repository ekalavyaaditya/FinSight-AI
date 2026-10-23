import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import * as THREE from "three";
import {
  Shield,
  TrendingUp,
  Cpu,
  Zap,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  DollarSign,
  PieChart,
  Layers,
  MessageSquare,
} from "lucide-react";

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize Three.js interactive visualizer background
  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        alpha: true,
        antialias: true,
      });
    } catch (error) {
      console.warn('WebGL is unavailable; showing the landing page without its animated background.', error);
      return;
    }

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Particle Cloud geometry
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 400;

    const posArray = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 12;
    }

    particlesGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(posArray, 3),
    );

    // Material with floating premium soft green/blue color particles
    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.035,
      color: "#0070f3",
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });

    const particlesMesh = new THREE.Points(
      particlesGeometry,
      particlesMaterial,
    );
    scene.add(particlesMesh);

    // Floating digital sphere
    const sphereGeometry = new THREE.SphereGeometry(2, 64, 64);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: "#0051af",
      wireframe: true,
      transparent: true,
      opacity: 0.1,
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphere);

    camera.position.z = 5;

    // Mouse interactive shift
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Re-adjust viewport
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", handleResize);

    const clock = new THREE.Clock();
    let animationFrameId = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Slow elegant rotation
      particlesMesh.rotation.y = elapsedTime * 0.05;
      particlesMesh.rotation.x = elapsedTime * 0.03;

      sphere.rotation.y = elapsedTime * 0.08;
      sphere.rotation.x = elapsedTime * 0.05;

      // Mouse interactive parallax
      particlesMesh.position.x = mouseX * 0.5;
      particlesMesh.position.y = mouseY * 0.5;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      particlesGeometry.dispose();
      particlesMaterial.dispose();
      sphereGeometry.dispose();
      sphereMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  const features = [
    {
      icon: <Cpu className="w-6 h-6 text-primary" />,
      title: "Neural Transaction Sorting",
      desc: "Our neural categorization scanner reads raw statement text and self-learns merchant distributions on the fly.",
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-primary" />,
      title: "ML Cash Flow Predictor",
      desc: "Continuous autoregressive analysis forecasts next month’s outgoing commitments, saving margins, and liquidity risks.",
    },
    {
      icon: <Layers className="w-6 h-6 text-primary" />,
      title: "Interactive Heatmap Ledger",
      desc: "Visualize dynamic density clusters of historical expenses inside a highly animated GitHub-style heatmap canvas.",
    },
    {
      icon: <Shield className="w-6 h-6 text-primary" />,
      title: "Bank-Grade AES Encryption",
      desc: "Every file and transactional statement undergoes secure sandbox parsing, protecting personal profiles with end-to-end hashes.",
    },
    {
      icon: <MessageSquare className="w-6 h-6 text-primary" />,
      title: "Voice AI Conversationalist",
      desc: "Chat directly with your platform using speech-to-text to perform complex data searches or generate advice pipelines instantly.",
    },
    {
      icon: <Zap className="w-6 h-6 text-primary" />,
      title: "EMI & Debt Simulation",
      desc: "Compare mortgage amortizations, simulate early payoff parameters, and forecast exact interest-saving matrices.",
    },
  ];

  return (
    <div className="relative min-h-screen bg-[#f8f9fa] dark:bg-[#07070a] text-foreground transition-colors duration-300">
      {/* Dynamic Interactive ThreeJS Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* Main Nav header */}
      <header className="sticky top-0 z-50 glass border-b border-border py-4 px-6 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            📈 FinSight AI
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a href="#features" className="hover:text-primary transition-colors">
            Features
          </a>
          <a href="#pricing" className="hover:text-primary transition-colors">
            Pricing
          </a>
          <a href="#faq" className="hover:text-primary transition-colors">
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="glass py-2 px-4 rounded-full text-sm font-medium text-primary hover:text-white bg-primary hover:bg-primary-dark transition-all shadow-premium"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-16 px-6 md:px-12 max-w-6xl mx-auto flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full text-xs font-semibold text-primary">
            <Zap className="w-3.5 h-3.5 animate-pulse" />
            Empowering Personal Wealth With Neural Intelligence
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-none max-w-4xl mx-auto">
            Your Personal AI Financial{" "}
            <span className="bg-gradient-to-r from-primary via-blue-500 to-indigo-600 bg-clip-text text-transparent">
              Intelligence Platform
            </span>
          </h1>
          <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto font-light">
            Securely import bank statements. AI parses transactions, builds
            predictive aggregates, designs debt payoff schedules, and boosts
            credit roadmaps automatically.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <Link
              to="/register"
              className="glass py-3 px-8 rounded-full text-base font-semibold text-primary hover:text-neutral-200 bg-primary hover:bg-primary-dark transition-all flex items-center gap-2 shadow-premium hover:shadow-premium-hover"
            >
              Register Free Profile <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#features"
              className="glass py-3 px-8 rounded-full text-base font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all"
            >
              Discover Features
            </a>
          </div>
        </motion.div>

        {/* Dashboard Preview mockup glass container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="mt-16 w-full max-w-5xl rounded-2xl glass p-3 border border-border shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent pointer-events-none" />
          <div className="bg-white/90 dark:bg-black/90 rounded-xl overflow-hidden shadow-inner p-6 flex flex-col md:flex-row gap-6 text-left">
            {/* Mock Side widgets */}
            <div className="flex-1 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-widest">
                    Financial Health Score
                  </h4>
                  <p className="text-3xl font-extrabold text-neutral-900 dark:text-white mt-1">
                    84
                    <span className="text-sm font-normal text-neutral-400">
                      /100
                    </span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin-slow flex items-center justify-center text-xs font-semibold">
                  A+
                </div>
              </div>
              <div className="h-[2px] bg-neutral-100 dark:bg-neutral-900" />
              <div className="grid grid-cols-2 gap-4">
                <div className="glass p-3 rounded-lg">
                  <p className="text-xs text-neutral-400">Monthly Net Income</p>
                  <p className="text-lg font-bold mt-1 text-primary">
                    $5,500.00
                  </p>
                </div>
                <div className="glass p-3 rounded-lg">
                  <p className="text-xs text-neutral-400">Estimated Expenses</p>
                  <p className="text-lg font-bold mt-1 text-neutral-800 dark:text-neutral-100">
                    $2,450.00
                  </p>
                </div>
              </div>
              <div className="glass p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
                <p className="text-xs font-bold text-primary flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5" /> AI Insight Alert
                </p>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 font-light leading-relaxed">
                  "Your restaurant and entertainment outlays grew 24% over
                  typical distributions. Trimming duplicate digital services
                  saves $45/mo."
                </p>
              </div>
            </div>

            {/* Mock Graphic Chart */}
            <div className="flex-1 min-h-[220px] bg-neutral-50 dark:bg-neutral-900 rounded-xl p-4 relative flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Spending Heat Density
                </p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">
                  Active Scan
                </span>
              </div>
              <div className="flex gap-1.5 items-end h-32 w-full px-2">
                {[40, 55, 30, 80, 45, 95, 60, 45, 75, 50, 110, 85].map(
                  (val, idx) => (
                    <div
                      key={idx}
                      className="flex-1 bg-gradient-to-t from-primary/40 to-primary rounded-t-sm transition-all duration-500 hover:opacity-80 relative group"
                      style={{ height: `${val}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] py-0.5 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        ${val * 15}
                      </div>
                    </div>
                  ),
                )}
              </div>
              <div className="flex justify-between text-[10px] text-neutral-400 px-1 font-medium">
                <span>Jan</span>
                <span>Jun</span>
                <span>Dec</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Feature section */}
      <section
        id="features"
        className="relative z-10 py-24 bg-white/50 dark:bg-black/40 border-y border-border"
      >
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Modular Fintech Infrastructure
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 font-light">
              We leverage advanced predictive algorithms, interactive data
              visualizers, and state-of-the-art security layers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -8 }}
                className="glass p-8 rounded-2xl border border-border shadow-premium flex flex-col gap-4 text-left transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold">{f.title}</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 font-light leading-relaxed">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 py-24">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Flexible Plan Pricing
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 font-light">
              Deploy automated personal finance tools that upgrade seamlessly as
              your asset pool scales.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto gap-8">
            {/* Free Tier */}
            <div className="glass p-8 rounded-2xl border border-border shadow-premium space-y-6 relative flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-widest">
                  Standard Edition
                </p>
                <h3 className="text-3xl font-extrabold mt-2">
                  $0{" "}
                  <span className="text-sm font-normal text-neutral-400">
                    / forever
                  </span>
                </h3>
                <p className="text-sm text-neutral-500 mt-2">
                  Perfect for basic budget analysis and manual entry testing.
                </p>
                <div className="h-[1px] bg-neutral-200 dark:bg-neutral-800 my-6" />
                <ul className="space-y-3.5 text-sm font-light">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4.5 h-4.5 text-primary" /> CSV
                    Bank statement uploads
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4.5 h-4.5 text-primary" />{" "}
                    Auto-categorize transactions
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4.5 h-4.5 text-primary" /> Basic
                    charts & summaries
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4.5 h-4.5 text-primary" />{" "}
                    Amortization schedule tool
                  </li>
                </ul>
              </div>
              <Link
                to="/register"
                className="glass py-3 px-6 rounded-full block text-center text-sm font-semibold bg-neutral-100 dark:bg-neutral-900 hover:opacity-85 transition-opacity"
              >
                Register Free Account
              </Link>
            </div>

            {/* Premium Tier */}
            <div className="glass p-8 rounded-2xl border-2 border-primary shadow-2xl space-y-6 relative flex flex-col justify-between overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold px-4 py-1 rounded-bl-xl tracking-widest uppercase">
                Featured
              </div>
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-widest">
                  Enterprise Premium
                </p>
                <h3 className="text-3xl font-extrabold mt-2">
                  $9.99{" "}
                  <span className="text-sm font-normal text-neutral-400">
                    / month
                  </span>
                </h3>
                <p className="text-sm text-neutral-500 mt-2">
                  Unlocks full PDF parsing, machine learning projections, and
                  voice assistance.
                </p>
                <div className="h-[1px] bg-neutral-200 dark:bg-neutral-800 my-6" />
                <ul className="space-y-3.5 text-sm font-light">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4.5 h-4.5 text-primary" />{" "}
                    Everything in Standard Tier
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4.5 h-4.5 text-primary" />{" "}
                    Unlimited PDF statement scanning
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4.5 h-4.5 text-primary" />{" "}
                    Autoregressive spending forecasts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4.5 h-4.5 text-primary" />{" "}
                    Complete Gemini AI Insights Engine
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4.5 h-4.5 text-primary" />{" "}
                    Conversational Speech AI Bot
                  </li>
                </ul>
              </div>
              <Link
                to="/register"
                className="glass py-3 px-6 rounded-full block text-center text-sm font-semibold text-black bg-primary hover:bg-primary-dark transition-all shadow-premium"
              >
                Subscribe to Premium
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordions Section */}
      <section
        id="faq"
        className="relative z-10 py-24 bg-white/40 dark:bg-black/30 border-t border-border"
      >
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl font-extrabold">
              Frequently Asked Questions
            </h2>
            <p className="text-neutral-500 font-light">
              Get answers to critical inquiries about our system operations.
            </p>
          </div>

          <div className="space-y-6">
            {[
              {
                q: "How safe are my uploaded statement files?",
                a: "Extremely safe. FinSight AI processes your uploaded bank statements inside a secure transient buffer. We do not store original raw files; we parse transactions into an encrypted schema mapped specifically to your protected User session, secured with standard authentication tokens.",
              },
              {
                q: "Can I change my default currency and portfolio profile?",
                a: "Yes, absolutely. By navigating to your Profile Settings panel, you can customize your base currency parameters (USD, EUR, GBP, INR), risk profiles, and notification preferences at any time.",
              },
              {
                q: "How accurate is the ML Spending Predictor?",
                a: "The predictive engine uses Scikit-Learn linear models. Accuracy and Confidence rating scale dynamically. With three or more consecutive months of statements, accuracy typically lands between 85% to 95% depending on standard expense variance.",
              },
            ].map((faq, index) => (
              <div
                key={index}
                className="glass p-6 rounded-xl border border-border"
              >
                <h4 className="text-base font-bold flex items-center gap-2 mb-2">
                  <HelpCircle className="w-4.5 h-4.5 text-primary flex-shrink-0" />{" "}
                  {faq.q}
                </h4>
                <p className="text-sm font-light text-neutral-600 dark:text-neutral-400 pl-6.5 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-3 px-6 md:px-12 text-center text-xs text-neutral-500 font-light">
        <p>
          © {new Date().getFullYear()} FinSight AI Inc. Designed with premium
          Stripe-like aesthetics. Fully secure.
        </p>
      </footer>
    </div>
  );
}

import { Shield, ArrowRight, Sparkles, Star, Zap } from "lucide-react";
import heroImage from "@/assets/hero-bg.jpg";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

const AnimatedCounter = ({ target, suffix = "" }: { target: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [target]);
  
  return <span>{count}{suffix}</span>;
};

const Hero = () => {
  const navigate = useNavigate();
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated Background - optimized with loading="eager" for LCP */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.3) saturate(0.8)',
        }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-background/80 via-background/70 to-primary/20" />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/30 via-transparent to-transparent" />

      {/* Reduced Particles for performance - only 6 instead of 20 */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/40 rounded-full animate-pulse"
            style={{
              left: `${20 + i * 15}%`,
              top: `${15 + i * 12}%`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Glowing Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/25 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[150px]" />

      <div className="container relative z-10 px-4 py-20">
        <div className="max-w-6xl mx-auto text-center space-y-10">
          {/* Animated Badge */}
          <div className="inline-flex items-center gap-3 glass px-6 py-3 rounded-full text-sm font-medium animate-fade-in border border-primary/20 shadow-lg shadow-primary/10">
            <div className="relative">
              <Shield className="w-5 h-5 text-primary" />
              <div className="absolute inset-0 bg-primary/50 rounded-full blur-md animate-ping" />
            </div>
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-semibold">
              Nigeria's #1 Secure Escrow Marketplace
            </span>
            <Sparkles className="w-4 h-4 text-accent animate-pulse" />
          </div>

          {/* Main Headline with Gradient */}
          <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <h1 className="text-5xl sm:text-6xl md:text-8xl font-black leading-tight px-2 tracking-tight drop-shadow-lg">
              <span className="text-white dark:text-white">Trade with</span>
              <span className="relative inline-block ml-4">
                <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent drop-shadow-2xl">Confidence</span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                  <path d="M2 10C50 4 100 2 150 6C200 10 250 4 298 8" stroke="url(#gradient)" strokeWidth="4" strokeLinecap="round"/>
                  <defs>
                    <linearGradient id="gradient" x1="0" y1="0" x2="300" y2="0">
                      <stop stopColor="hsl(210 85% 50%)" />
                      <stop offset="1" stopColor="hsl(160 70% 45%)" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </h1>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white/90 dark:text-white/90 drop-shadow-md">
              Payments <span className="text-secondary font-extrabold">Protected</span> Always
            </h2>
          </div>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl md:text-2xl text-white/80 dark:text-white/80 max-w-4xl mx-auto leading-relaxed px-2 animate-fade-in drop-shadow-sm" style={{ animationDelay: '0.4s' }}>
            JZTradeHub holds your payment <span className="text-primary font-semibold">securely in escrow</span> until you confirm delivery. 
            Buy and sell with <span className="text-secondary font-semibold">complete peace of mind</span>.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4 animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <a 
              href="/marketplace"
              className="group relative inline-flex items-center justify-center text-lg px-10 py-5 rounded-2xl font-semibold overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary/30"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-accent transition-all duration-300 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <span className="relative text-primary-foreground flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Start Shopping
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </a>
            
            <a 
              href="/become-seller"
              className="group inline-flex items-center justify-center text-lg px-10 py-5 rounded-2xl glass border-2 border-primary/20 font-semibold hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 hover:scale-105"
            >
              <Star className="w-5 h-5 mr-2 text-secondary" />
              Become a Seller
            </a>

            {/* ✅ FIXED: Button is now inside the flex container */}
            <Button 
              onClick={() => navigate("/profile?tab=bills")}
              variant="outline" 
              className="gap-2"
            >
              <Zap className="w-4 h-4" />
              Pay Bills
            </Button>
          </div>

          {/* Stats with Animation */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 max-w-4xl mx-auto pt-12 animate-fade-in" style={{ animationDelay: '0.8s' }}>
            <div className="glass-strong p-6 rounded-2xl text-center hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 group">
              <div className="text-3xl sm:text-4xl font-black text-primary group-hover:scale-110 transition-transform">
                <AnimatedCounter target={100} suffix="%" />
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">Secure Payments</div>
            </div>
            <div className="glass-strong p-6 rounded-2xl text-center hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 group">
              <div className="text-3xl sm:text-4xl font-black text-accent group-hover:scale-110 transition-transform">
                <AnimatedCounter target={10} suffix="K+" />
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">Happy Customers</div>
            </div>
            <div className="glass-strong p-6 rounded-2xl text-center hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-secondary/10 group">
              <div className="text-3xl sm:text-4xl font-black text-secondary group-hover:scale-110 transition-transform">24/7</div>
              <div className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">Support Available</div>
            </div>
            <div className="glass-strong p-6 rounded-2xl text-center hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 group">
              <div className="text-3xl sm:text-4xl font-black text-primary group-hover:scale-110 transition-transform">
                <AnimatedCounter target={5} suffix="%" />
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">Low Commission</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent z-10" />
    </section>
  );
};

export default Hero;
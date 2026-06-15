import { Lock, Users, Headphones, TrendingUp, Award, Zap, Sparkles, Shield, ArrowUpRight } from "lucide-react";
import { useState } from "react";

const FeatureCard = ({ 
  icon: Icon, 
  title, 
  description, 
  gradient, 
  delay 
}: { 
  icon: any; 
  title: string; 
  description: string; 
  gradient: string;
  delay: string;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className="group relative glass-strong rounded-3xl p-8 transition-all duration-500 animate-fade-in cursor-pointer overflow-hidden"
      style={{ animationDelay: delay }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Hover gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
      
      {/* Glow effect */}
      <div className={`absolute -inset-1 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500`} />
      
      {/* Content */}
      <div className="relative z-10">
        <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${gradient} mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}>
          <Icon className="w-8 h-8 text-white" />
        </div>
        
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-2xl font-bold group-hover:text-primary transition-colors text-foreground">{title}</h3>
          <ArrowUpRight className={`w-5 h-5 text-muted-foreground transition-all duration-300 ${isHovered ? 'opacity-100 translate-x-0 -translate-y-0' : 'opacity-0 -translate-x-2 translate-y-2'}`} />
        </div>
        
        <p className="text-muted-foreground leading-relaxed group-hover:text-foreground/80 transition-colors">
          {description}
        </p>
      </div>
      
      {/* Corner decoration */}
      <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-primary/5 to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </div>
  );
};

const Features = () => {
  const features = [
    {
      icon: Lock,
      title: "Escrow Protection",
      description: "Your payment is held securely until you confirm delivery. Never worry about fraud again.",
      gradient: "from-primary to-accent",
    },
    {
      icon: Users,
      title: "Verified Sellers",
      description: "All sellers are verified and vetted to ensure quality and trustworthiness.",
      gradient: "from-accent to-secondary",
    },
    {
      icon: Headphones,
      title: "24/7 Support",
      description: "Our dedicated support team is always ready to help via WhatsApp and live chat.",
      gradient: "from-secondary to-primary",
    },
    {
      icon: TrendingUp,
      title: "Low Commission",
      description: "Only 5% commission per transaction. More profit for sellers, better value for buyers.",
      gradient: "from-primary to-secondary",
    },
    {
      icon: Award,
      title: "Dispute Resolution",
      description: "Fair and fast dispute handling ensures everyone gets a square deal.",
      gradient: "from-accent to-primary",
    },
    {
      icon: Zap,
      title: "Quick Payments",
      description: "Fast payment processing once delivery is confirmed. Get your money quickly.",
      gradient: "from-secondary to-accent",
    },
  ];

  return (
    <section className="relative py-28 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container px-4 relative z-10">
        <div className="text-center mb-20 animate-fade-in">
          <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Premium Features</span>
          </div>
          
          <h2 className="text-4xl md:text-6xl font-black mb-6 text-foreground">
            Why Choose{" "}
            <span className="relative inline-block">
              <span className="gradient-text">JZTradeHub</span>
              <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-secondary rounded-full" />
            </span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Premium features designed to make online trading <span className="text-primary font-semibold">safe</span> and <span className="text-secondary font-semibold">profitable</span>
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              gradient={feature.gradient}
              delay={`${index * 0.1}s`}
            />
          ))}
        </div>
        
        {/* Bottom CTA */}
        <div className="text-center mt-16 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <div className="inline-flex items-center gap-3 glass-strong px-8 py-4 rounded-2xl">
            <Shield className="w-6 h-6 text-primary" />
            <span className="text-lg font-semibold">Trusted by 10,000+ users across Nigeria</span>
            <div className="flex -space-x-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent border-2 border-background flex items-center justify-center text-xs text-white font-bold">
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
              <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-bold">
                +9K
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
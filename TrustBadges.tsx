import { Shield, Lock, Award, CheckCircle, Star, Users, TrendingUp, Zap } from "lucide-react";

const TrustBadges = () => {
  const badges = [
    { icon: Shield, title: "Bank-Level Security", description: "256-bit SSL encryption", color: "primary" },
    { icon: Lock, title: "Escrow Protected", description: "All transactions secured", color: "accent" },
    { icon: Award, title: "Verified Platform", description: "Trusted by thousands", color: "secondary" },
    { icon: CheckCircle, title: "Money-Back Guarantee", description: "Full refund if not received", color: "primary" },
  ];

  const stats = [
    { icon: Users, value: "10K+", label: "Active Users" },
    { icon: TrendingUp, value: "₦50M+", label: "Transactions" },
    { icon: Star, value: "4.9", label: "User Rating" },
    { icon: Zap, value: "99.9%", label: "Uptime" },
  ];

  return (
    <section className="relative py-20 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5" />
      
      <div className="container px-4 relative z-10">
        {/* Trust Badges */}
        <div className="glass-strong rounded-3xl p-8 md:p-12 max-w-6xl mx-auto mb-12 animate-fade-in">
          <h3 className="text-center text-xl font-bold text-muted-foreground mb-8">
            🛡️ Your Trust is Our Priority
          </h3>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {badges.map((badge, index) => {
              const Icon = badge.icon;
              return (
                <div 
                  key={badge.title}
                  className="group text-center space-y-3 p-4 rounded-2xl hover:bg-white/50 dark:hover:bg-white/5 transition-all duration-300 animate-scale-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br from-${badge.color}/20 to-${badge.color}/5 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-7 h-7 text-${badge.color}`} />
                  </div>
                  <h4 className="font-bold text-lg">{badge.title}</h4>
                  <p className="text-sm text-muted-foreground">{badge.description}</p>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Live Stats Bar */}
        <div className="glass rounded-2xl p-6 max-w-4xl mx-auto animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="text-center group">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Icon className="w-5 h-5 text-primary" />
                    <span className="text-2xl md:text-3xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      {stat.value}
                    </span>
                  </div>
                  <span className="text-xs md:text-sm text-muted-foreground font-medium">{stat.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustBadges;
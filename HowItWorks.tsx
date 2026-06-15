import { UserPlus, ShoppingCart, Shield, Package, CheckCircle2, Wallet, ArrowRight } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    { icon: UserPlus, title: "Register & List", description: "Sellers create accounts and list products with detailed descriptions and images.", color: "primary" },
    { icon: ShoppingCart, title: "Browse & Order", description: "Buyers explore products and place orders through our secure platform.", color: "accent" },
    { icon: Shield, title: "Payment Secured", description: "JZTradeHub holds payment safely in escrow until delivery confirmation.", color: "secondary" },
    { icon: Package, title: "Item Delivered", description: "Seller ships the product with tracking and proof of delivery.", color: "primary" },
    { icon: CheckCircle2, title: "Buyer Confirms", description: "Buyer verifies the product quality and confirms successful delivery.", color: "secondary" },
    { icon: Wallet, title: "Payment Released", description: "Funds are released to seller minus our small 5% commission.", color: "accent" },
  ];

  return (
    <section className="relative py-28 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-background to-muted/30" />
      
      {/* Animated line connecting steps */}
      <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent hidden lg:block" />
      
      <div className="container px-4 relative z-10">
        <div className="text-center mb-20 animate-fade-in">
          <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full text-sm font-medium mb-6">
            <ArrowRight className="w-4 h-4 text-primary" />
            <span>Simple Process</span>
          </div>
          
          <h2 className="text-4xl md:text-6xl font-black mb-6 text-foreground">
            How{" "}
            <span className="gradient-text">JZTradeHub</span>{" "}
            Works
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A simple, secure process that protects both buyers and sellers
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div 
                key={step.title}
                className="group relative animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Connector arrow (only on desktop, not on last of each row) */}
                {(index + 1) % 3 !== 0 && index < 5 && (
                  <div className="hidden lg:block absolute top-12 -right-4 z-20">
                    <ArrowRight className="w-8 h-8 text-primary/30" />
                  </div>
                )}
                
                <div className="glass glass-hover p-8 rounded-3xl h-full">
                  {/* Step number */}
                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-black text-lg shadow-lg shadow-primary/30">
                    {index + 1}
                  </div>
                  
                  {/* Icon */}
                  <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br from-${step.color}/20 to-${step.color}/5 mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                    <Icon className={`w-8 h-8 text-${step.color}`} />
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors text-foreground">
                    {step.title}
                  </h3>
                  
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Bottom illustration */}
        <div className="flex justify-center mt-16">
          <div className="glass-strong px-8 py-4 rounded-2xl flex items-center gap-4 animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-secondary rounded-full animate-pulse" />
              <span className="text-sm font-medium">Average transaction time:</span>
            </div>
            <span className="text-2xl font-black text-primary">2-5 days</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
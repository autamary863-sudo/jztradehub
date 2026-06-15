import { ArrowRight, ShoppingBag, Store, Sparkles, CheckCircle, Zap, Star } from "lucide-react";

const CTA = () => {
  return (
    <section className="relative py-28 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary/20 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-accent/20 rounded-full blur-[150px]" />
      
      <div className="container px-4 relative z-10">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Buyer CTA */}
          <div className="group glass-strong rounded-3xl p-8 md:p-12 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 animate-fade-in overflow-hidden relative">
            {/* Decorative gradient */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="flex flex-col lg:flex-row items-center gap-8 relative z-10">
              <div className="flex-1 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>For Buyers</span>
                </div>
                
                <div className="flex items-center gap-4 justify-center lg:justify-start mb-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform duration-300">
                    <ShoppingBag className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-3xl md:text-4xl font-black text-foreground">Start Shopping Safely</h3>
                </div>
                
                <p className="text-lg text-muted-foreground mb-8 max-w-xl">
                  Browse thousands of products from verified sellers. Your payment is <span className="text-primary font-semibold">protected until delivery</span>.
                </p>
                
                <a 
                  href="/marketplace"
                  className="group/btn inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-primary to-accent text-white hover:shadow-xl hover:shadow-primary/30 px-8 py-4 font-bold text-lg transition-all duration-300 hover:scale-105"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Browse Products
                  <ArrowRight className="ml-2 w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                </a>
              </div>
              
              <div className="w-full lg:w-auto">
                <div className="glass p-6 rounded-2xl space-y-4 border border-primary/10">
                  <h4 className="font-bold text-lg flex items-center gap-2 text-foreground">
                    <Star className="w-5 h-5 text-primary" />
                    Buyer Benefits
                  </h4>
                  {["Secure escrow checkout", "Money-back guarantee", "24/7 customer support", "Verified sellers only"].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <CheckCircle className="w-5 h-5 text-secondary flex-shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Seller CTA */}
          <div className="group glass-strong rounded-3xl p-8 md:p-12 hover:shadow-2xl hover:shadow-secondary/10 transition-all duration-500 animate-fade-in overflow-hidden relative" style={{ animationDelay: '0.2s' }}>
            {/* Decorative gradient */}
            <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="flex flex-col lg:flex-row-reverse items-center gap-8 relative z-10">
              <div className="flex-1 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <Sparkles className="w-4 h-4 text-secondary" />
                  <span>For Sellers</span>
                </div>
                
                <div className="flex items-center gap-4 justify-center lg:justify-start mb-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-secondary to-accent shadow-lg shadow-secondary/30 group-hover:scale-110 transition-transform duration-300">
                    <Store className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-3xl md:text-4xl font-black text-foreground">Grow Your Business</h3>
                </div>
                
                <p className="text-lg text-muted-foreground mb-8 max-w-xl">
                  Reach thousands of buyers on our trusted platform. Only <span className="text-secondary font-semibold">5% commission</span> per sale.
                </p>
                
                <a 
                  href="/become-seller"
                  className="group/btn inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-secondary to-accent text-white hover:shadow-xl hover:shadow-secondary/30 px-8 py-4 font-bold text-lg transition-all duration-300 hover:scale-105"
                >
                  <Store className="w-5 h-5 mr-2" />
                  Start Selling
                  <ArrowRight className="ml-2 w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                </a>
              </div>
              
              <div className="w-full lg:w-auto">
                <div className="glass p-6 rounded-2xl space-y-4 border border-secondary/10">
                  <h4 className="font-bold text-lg flex items-center gap-2 text-foreground">
                    <Star className="w-5 h-5 text-secondary" />
                    Seller Benefits
                  </h4>
                  {["Free to list products", "Fast payment release", "Marketing support", "Seller dashboard & analytics"].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
};

export default CTA;
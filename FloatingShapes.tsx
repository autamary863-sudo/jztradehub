const FloatingShapes = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Large gradient orbs */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-primary/15 to-accent/10 rounded-full blur-3xl float" />
      <div className="absolute top-40 right-20 w-72 h-72 bg-gradient-to-br from-accent/15 to-secondary/10 rounded-full blur-2xl float-delayed" />
      <div className="absolute bottom-32 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-secondary/10 to-primary/5 rounded-full blur-3xl float-slow" />
      
      {/* Medium decorative shapes */}
      <div className="absolute top-1/3 right-1/3 w-48 h-48 bg-primary/8 rounded-full blur-xl float" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/8 rounded-full blur-2xl float-delayed" />
      <div className="absolute top-2/3 left-1/3 w-80 h-80 bg-secondary/8 rounded-full blur-3xl float-slow" />
      
      {/* Geometric accents */}
      <div className="absolute top-1/4 right-1/6 w-32 h-32 border border-primary/10 rounded-3xl rotate-45 float opacity-50" />
      <div className="absolute bottom-1/3 left-1/6 w-24 h-24 border border-accent/10 rounded-2xl rotate-12 float-delayed opacity-50" />
      <div className="absolute top-1/2 right-1/4 w-20 h-20 border border-secondary/10 rounded-xl -rotate-12 float-slow opacity-50" />
      
      {/* Small sparkle dots */}
      <div className="absolute top-[15%] left-[20%] w-2 h-2 bg-primary/40 rounded-full animate-pulse" />
      <div className="absolute top-[25%] right-[30%] w-1.5 h-1.5 bg-accent/40 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
      <div className="absolute top-[45%] left-[15%] w-2 h-2 bg-secondary/40 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-[35%] right-[20%] w-1.5 h-1.5 bg-primary/40 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
      <div className="absolute bottom-[25%] left-[35%] w-2 h-2 bg-accent/40 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      
      {/* Gradient lines */}
      <div className="absolute top-0 left-1/2 w-px h-96 bg-gradient-to-b from-primary/20 via-primary/5 to-transparent" />
      <div className="absolute bottom-0 right-1/3 w-px h-64 bg-gradient-to-t from-accent/20 via-accent/5 to-transparent" />
    </div>
  );
};

export default FloatingShapes;
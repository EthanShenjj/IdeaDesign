export default function BackgroundLights() {
  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
      <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-accent/20 blur-[120px] rounded-full animate-float-light opacity-60" />
      <div className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-tertiary/10 blur-[150px] rounded-full animate-float-light opacity-40" style={{ animationDelay: '-5s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/40 blur-[180px] rounded-full animate-float-light opacity-30" style={{ animationDelay: '-10s' }} />
    </div>
  );
}

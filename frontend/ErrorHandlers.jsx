import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("GymDeck Module Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-rose-50 border border-rose-100 rounded-3xl m-4">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Component Failed to Load</h2>
          <p className="text-sm font-bold text-slate-500 mt-3 max-w-md leading-relaxed">
            We encountered a technical issue while rendering this workspace module. 
            This might be due to a network interruption or a local system conflict.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
          >
            <RotateCcw size={16} />
            Reload Workspace
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export const LoadingFallback = () => (
  <div className="flex flex-col items-center justify-center p-20 text-center animate-pulse">
    <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-6" />
    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Initializing Module...</span>
  </div>
);

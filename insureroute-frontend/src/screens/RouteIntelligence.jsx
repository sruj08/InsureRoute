import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getRouteOptions, chatWithAgent, getNodes, getLiveDisruptions } from '../api';
import Map from '../components/Map';
import { Bot, Send, ShieldAlert, Zap, Truck, Train, Plane, Ship, CheckCircle2, ChevronRight, Upload } from 'lucide-react';

export default function RouteIntelligence() {
  const { shipmentId } = useParams();
  const navigate = useNavigate();
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { role: 'agent', content: 'Analyzing multi-modal route options for your shipment. How can I help optimize this?' }
  ]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const chatEndRef = useRef(null);

  const { data: routeOptions, isLoading: loadingRoutes } = useQuery({
    queryKey: ['routeOptions', shipmentId],
    queryFn: () => getRouteOptions(shipmentId)
  });

  const { data: nodes, isLoading: loadingNodes } = useQuery({
    queryKey: ['nodes'],
    queryFn: getNodes
  });

  const { data: disruptions } = useQuery({
    queryKey: ['disruptions'],
    queryFn: getLiveDisruptions,
    refetchInterval: 10000
  });

  const chatMutation = useMutation({
    mutationFn: chatWithAgent,
    onSuccess: (data) => {
      setChatHistory(prev => [...prev, { 
        role: 'agent', 
        content: data.response,
        tools: data.tools_invoked 
      }]);
    }
  });

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    setChatHistory(prev => [...prev, { role: 'user', content: chatInput }]);
    chatMutation.mutate({ shipment_id: shipmentId, message: chatInput });
    setChatInput('');
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const ROUTE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

  const mapData = useMemo(() => {
    if (!routeOptions || !nodes) return { routes: [], markers: [], checkpoints: [] };
    
    const nodeMap = {};
    nodes.forEach(n => nodeMap[n.id] = n);

    const disruptedNodeIds = new Set(disruptions?.map(d => d.checkpoint_id) || []);

    const routes = routeOptions.map((route, idx) => ({
      id: route.route_id,
      positions: route.path.map(nodeId => {
        const n = nodeMap[nodeId];
        return n ? [n.lat, n.lon] : null;
      }).filter(Boolean),
      isBest: idx === 0,
      isMultimodal: route.is_multimodal,
      modes: route.modes,
      baseColor: ROUTE_COLORS[idx % ROUTE_COLORS.length]
    }));

    // Add a visual offset so rail and air multimodal routes don't perfectly overlap
    routes.forEach(r => {
        if (r.modes.includes('rail')) {
             r.positions = r.positions.map(p => [p[0] + 0.015, p[1] - 0.015]);
        }
    });

    const checkpointMap = {};
    routeOptions.forEach(route => {
      route.path.forEach(nodeId => {
        if (!checkpointMap[nodeId] && nodeMap[nodeId]) {
          checkpointMap[nodeId] = {
            lat: nodeMap[nodeId].lat,
            lon: nodeMap[nodeId].lon,
            label: nodeMap[nodeId].name,
            isDisrupted: disruptedNodeIds.has(nodeId)
          };
        }
      });
    });

    const checkpoints = Object.values(checkpointMap);

    let markers = [];
    if (routeOptions.length > 0) {
      const bestRoute = routeOptions[0];
      const startNode = nodeMap[bestRoute.path[0]];
      const endNode = nodeMap[bestRoute.path[bestRoute.path.length - 1]];
      if (startNode) markers.push({ lat: startNode.lat, lon: startNode.lon, label: startNode.name });
      if (endNode) markers.push({ lat: endNode.lat, lon: endNode.lon, label: endNode.name });
    }

    return { routes, markers, checkpoints };
  }, [routeOptions, nodes, disruptions]);

  const ModeIcon = ({ mode, className = "w-4 h-4" }) => {
    if (mode === 'road') return <Truck className={className} />;
    if (mode === 'rail') return <Train className={className} />;
    if (mode === 'air') return <Plane className={className} />;
    if (mode === 'sea') return <Ship className={className} />;
    return <Truck className={className} />;
  };

  if (loadingRoutes || loadingNodes) return <div className="flex h-full items-center justify-center p-12">Loading analysis...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-100px)]">
      
      {/* LEFT COLUMN: Route Options */}
      <div className="col-span-1 lg:col-span-3 bg-bgCard rounded-xl shadow-card overflow-y-auto flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="font-bold text-lg">Route Options</h2>
          <p className="text-xs text-textSecondary">Gemini Recommended</p>
        </div>
        <div className="p-4 flex flex-col gap-4 overflow-y-auto">
          {routeOptions?.map((route, idx) => (
            <div 
              key={route.route_id} 
              onClick={() => setSelectedRouteId(route.route_id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedRouteId === route.route_id || (!selectedRouteId && idx === 0)
                  ? 'border-accentPrimary bg-bgCardAlt shadow-md' 
                  : 'border-border hover:border-textMuted'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-1">
                  {route.modes.map((mode, i) => (
                    <React.Fragment key={i}>
                      <span className="p-1.5 bg-white rounded-md border text-textSecondary"><ModeIcon mode={mode} /></span>
                      {i < route.modes.length - 1 && <ChevronRight className="w-3 h-3 text-textMuted" />}
                    </React.Fragment>
                  ))}
                </div>
                {idx === 0 && <span className="bg-accentSuccess/10 text-accentSuccess text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1"><Zap className="w-3 h-3" /> Best</span>}
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                <div>
                  <div className="text-xs text-textSecondary">ETA</div>
                  <div className="font-mono font-medium">{Math.floor(route.total_time_min / 60)}h {route.total_time_min % 60}m</div>
                </div>
                <div>
                  <div className="text-xs text-textSecondary">Cost</div>
                  <div className="font-mono font-medium">₹{route.total_cost_inr.toLocaleString()}</div>
                </div>
              </div>

              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/monitor/${shipmentId}`);
                }}
                className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedRouteId === route.route_id || (!selectedRouteId && idx === 0)
                    ? 'bg-accentPrimary text-white' 
                    : 'bg-bgPrimary text-textSecondary hover:bg-gray-200'
                }`}
              >
                Select Route
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* CENTER: Map */}
      <div className="col-span-1 lg:col-span-5 bg-bgCard rounded-xl shadow-card overflow-hidden relative">
        <Map markers={mapData.markers} routes={mapData.routes} selectedRouteId={selectedRouteId} />
      </div>

      {/* RIGHT COLUMN: AI Chat */}
      <div className="col-span-1 lg:col-span-4 bg-bgCard rounded-xl shadow-card flex flex-col h-full border border-border">
        <div className="p-4 border-b border-border flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="w-8 h-8 rounded-full bg-accentPrimary text-white flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm">InsureRoute AI</h3>
            <p className="text-xs text-textSecondary">Powered by Gemini 2.5 Flash</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] rounded-xl p-3 text-sm ${
                msg.role === 'user' 
                  ? 'bg-accentPrimary text-white rounded-tr-sm' 
                  : 'bg-bgPrimary text-textPrimary border border-border rounded-tl-sm'
              }`}>
                {msg.content}
              </div>
              
              {/* Tool calls display */}
              {msg.tools && msg.tools.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {msg.tools.map((tool, tIdx) => (
                    <div key={tIdx} className="text-[10px] font-mono bg-blue-50 text-accentPrimary border border-blue-100 px-2 py-1 rounded-md flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {tool.name}()
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {chatMutation.isPending && (
             <div className="self-start bg-bgPrimary border border-border p-3 rounded-xl rounded-tl-sm flex gap-1">
               <div className="w-2 h-2 bg-textMuted rounded-full animate-bounce"></div>
               <div className="w-2 h-2 bg-textMuted rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
               <div className="w-2 h-2 bg-textMuted rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
             </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleChatSubmit} className="p-3 border-t border-border bg-white flex gap-2">
          <button type="button" className="p-2 text-textMuted hover:text-accentPrimary transition-colors" title="Upload Radar Image">
            <Upload className="w-5 h-5" />
          </button>
          <input 
            type="text" 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask Gemini to optimize..." 
            className="flex-1 bg-bgPrimary border border-border rounded-full px-4 py-2 text-sm outline-none focus:border-accentPrimary"
          />
          <button 
            type="submit" 
            disabled={!chatInput.trim() || chatMutation.isPending}
            className="p-2 bg-accentPrimary text-white rounded-full disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
}
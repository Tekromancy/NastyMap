import React, { useState, useEffect } from 'react';
import type { NmapHost, TopologyNode, HostAction, CustomDrawerTab, HostActionContext } from '../types/nmap';
import { getHostIcon } from '../icons/index';
import {
  X,
  Shield,
  Activity,
  Globe,
  Clock,
  Tag,
  MessageSquare,
  ChevronRight,
  Terminal,
  ExternalLink,
  Info,
  Server,
  Layers,
  MapPin,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export interface HostDetailDrawerProps {
  node: TopologyNode | null;
  onClose: () => void;
  onUpdateComment?: (hostId: string, comment: string) => void;
  onUpdateTags?: (hostId: string, tags: string[]) => void;
  onUpdateHost?: (hostId: string, updater: (prev: NmapHost) => NmapHost | Partial<NmapHost>) => void;
  customActions?: HostAction[];
  customTabs?: CustomDrawerTab[];
  renderHostActions?: (host: NmapHost, context: HostActionContext) => React.ReactNode;
}

export function HostDetailDrawer({
  node,
  onClose,
  onUpdateComment,
  onUpdateTags,
  onUpdateHost,
  customActions = [],
  customTabs = [],
  renderHostActions,
}: HostDetailDrawerProps) {
  if (!node) return null;

  const host = node.hostRef;
  const [commentText, setCommentText] = useState(host?.comments || '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(host?.tags || []);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'warning' | 'error' } | null>(null);

  const IconComp = getHostIcon(node.osFamily, node.deviceType, node.nodeType);

  const notify = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  const handleUpdateHostInternal = (updater: (prev: NmapHost) => NmapHost | Partial<NmapHost>) => {
    if (onUpdateHost && host) {
      onUpdateHost(host.id, updater);
    }
  };

  const actionContext: HostActionContext = {
    node,
    updateHost: handleUpdateHostInternal,
    notify,
    closeDrawer: onClose,
  };

  const handleExecuteAction = async (action: HostAction) => {
    if (!host) return;
    if (action.isDisabled && action.isDisabled(host)) return;

    try {
      setActionLoadingId(action.id);
      const result = await action.onClick(host, actionContext);
      if (result && onUpdateHost) {
        onUpdateHost(host.id, () => result);
      }
    } catch (err: any) {
      notify(`Action failed: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Keyboard shortcut listener for custom host actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.key === 'Escape') {
        onClose();
        return;
      }

      for (const action of customActions) {
        if (!action.shortcut) continue;
        const s = action.shortcut.toLowerCase();
        const matchesKey =
          e.key.toLowerCase() === s ||
          (e.shiftKey && `shift+${e.key.toLowerCase()}` === s) ||
          (e.ctrlKey && `ctrl+${e.key.toLowerCase()}` === s);

        if (matchesKey) {
          e.preventDefault();
          handleExecuteAction(action);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [customActions, host, node, onUpdateHost]);

  const handleSaveComment = () => {
    if (onUpdateComment && host) {
      onUpdateComment(host.id, commentText);
    }
    if (onUpdateHost && host) {
      onUpdateHost(host.id, (prev) => ({ comments: commentText }));
    }
    notify('Security notes saved', 'success');
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      const newTags = Array.from(new Set([...tags, tagInput.trim()]));
      setTags(newTags);
      setTagInput('');
      if (onUpdateTags && host) {
        onUpdateTags(host.id, newTags);
      }
      if (onUpdateHost && host) {
        onUpdateHost(host.id, (prev) => ({ tags: newTags }));
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter((t) => t !== tagToRemove);
    setTags(newTags);
    if (onUpdateTags && host) {
      onUpdateTags(host.id, newTags);
    }
    if (onUpdateHost && host) {
      onUpdateHost(host.id, (prev) => ({ tags: newTags }));
    }
  };

  const builtInTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'ports', label: `Ports (${node.openPorts.length})` },
    { id: 'trace', label: 'Route Trace' },
    { id: 'scripts', label: 'Scripts' },
    { id: 'notes', label: 'Notes & Tags' },
  ];

  const allTabs = [
    ...builtInTabs,
    ...customTabs.map((ct) => ({
      id: ct.id,
      label: ct.badge && host ? `${ct.label} (${ct.badge(host)})` : ct.label,
    })),
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in"
      onClick={onClose}
    >
      <aside
        aria-label="Host Inspector"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[540px] max-h-[88vh] bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800 shadow-2xl rounded-2xl flex flex-col text-zinc-100 font-sans overflow-hidden transition-all duration-200"
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-start justify-between bg-zinc-900/50">
          <div className="flex items-center gap-3.5">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner"
              style={{
                backgroundColor: `${node.color || '#3b82f6'}20`,
                borderColor: `${node.color || '#3b82f6'}60`,
                color: node.color || '#3b82f6',
              }}
            >
              <IconComp size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">{node.label}</h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                    node.status === 'up'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                  }`}
                >
                  {node.status}
                </span>
                {host?.isQuarantined && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 text-[10px] font-bold border border-amber-800 animate-pulse">
                    QUARANTINED
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-zinc-400 mt-0.5">{node.ip}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Close Drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Custom Actions Toolbar */}
        {(customActions.length > 0 || renderHostActions) && (
          <div className="px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800/80 flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Zap size={12} className="text-amber-400" />
              Actions:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {customActions.map((action) => {
                const isLoading = actionLoadingId === action.id;
                const isDisabled = (action.isDisabled && host && action.isDisabled(host)) || isLoading;
                if (action.isVisible && host && !action.isVisible(host)) return null;

                return (
                  <button
                    key={action.id}
                    disabled={isDisabled}
                    onClick={() => handleExecuteAction(action)}
                    title={action.tooltip || action.description}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm ${
                      action.variant === 'primary'
                        ? 'bg-sky-600 hover:bg-sky-500 text-white'
                        : action.variant === 'danger'
                        ? 'bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800'
                        : action.variant === 'warning'
                        ? 'bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800'
                        : action.variant === 'success'
                        ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                    } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isLoading ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      action.icon
                    )}
                    <span>{action.label}</span>
                    {action.shortcut && (
                      <kbd className="px-1 py-0.2 bg-black/40 text-[9px] font-mono rounded text-zinc-300 border border-zinc-700/50">
                        {action.shortcut.toUpperCase()}
                      </kbd>
                    )}
                  </button>
                );
              })}

              {renderHostActions && host && renderHostActions(host, actionContext)}
            </div>
          </div>
        )}

        {/* Toast / Notification Banner */}
        {toast && (
          <div
            className={`px-4 py-2 text-xs flex items-center gap-2 border-b ${
              toast.type === 'success'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                : toast.type === 'error'
                ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                : toast.type === 'warning'
                ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                : 'bg-sky-950/80 text-sky-300 border-sky-800'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={14} className="text-emerald-400" />
            ) : (
              <AlertTriangle size={14} className="text-amber-400" />
            )}
            <span className="flex-1 font-medium">{toast.message}</span>
            <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100">
              <X size={12} />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/30 px-3 pt-2 text-xs font-medium overflow-x-auto">
          {allTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-sky-500 text-sky-400 font-semibold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                  <Activity size={14} className="text-sky-400" />
                  <span>Latency (RTT)</span>
                </div>
                <div className="text-base font-bold text-white font-mono">
                  {node.latencyMs !== undefined ? `${node.latencyMs} ms` : 'N/A'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                  <Layers size={14} className="text-emerald-400" />
                  <span>Hop Distance</span>
                </div>
                <div className="text-base font-bold text-white font-mono">
                  {node.hopsAway} {node.hopsAway === 1 ? 'hop' : 'hops'}
                </div>
              </div>
            </div>

            {/* OS Detection */}
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <Server size={14} className="text-purple-400" />
                  <span className="font-semibold uppercase tracking-wider text-zinc-300">OS Detection</span>
                </div>
                {host?.os?.osmatches[0]?.accuracy && (
                  <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 font-mono text-[11px] border border-purple-800/40">
                    {host.os.osmatches[0].accuracy}% Accuracy
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-white">{node.osName}</p>
              <div className="text-xs text-zinc-400 grid grid-cols-2 gap-y-1 gap-x-4 pt-1 border-t border-zinc-800/60 font-mono">
                <div>Family: <span className="text-zinc-200">{node.osFamily}</span></div>
                <div>Device: <span className="text-zinc-200">{node.deviceType}</span></div>
                <div>Subnet: <span className="text-zinc-200">{node.subnet}</span></div>
                {host?.uptime && (
                  <div>Uptime: <span className="text-zinc-200">{Math.round(host.uptime.seconds / 86400)} days</span></div>
                )}
              </div>
            </div>

            {/* Geolocation */}
            {node.geolocation && (
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2.5">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <MapPin size={14} className="text-rose-400" />
                  <span className="font-semibold uppercase tracking-wider text-zinc-300">Geographic Location</span>
                </div>
                <div className="text-xs text-zinc-300 space-y-1">
                  <p className="font-medium text-white text-sm">
                    {node.geolocation.city ? `${node.geolocation.city}, ` : ''}
                    {node.geolocation.country || 'Unknown'}
                  </p>
                  <p className="text-zinc-400 font-mono text-[11px]">
                    {node.geolocation.latitude.toFixed(4)}, {node.geolocation.longitude.toFixed(4)}
                  </p>
                  {node.geolocation.org && (
                    <p className="text-zinc-400 font-mono text-[11px]">Org: {node.geolocation.org}</p>
                  )}
                  {node.geolocation.asn && (
                    <p className="text-zinc-400 font-mono text-[11px]">ASN: {node.geolocation.asn}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PORTS TAB */}
        {activeTab === 'ports' && (
          <div className="space-y-3">
            {node.openPortDetails.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                <Shield size={32} className="mx-auto mb-2 opacity-50" />
                <p>No open ports discovered on this host.</p>
              </div>
            ) : (
              node.openPortDetails.map((port) => (
                <div
                  key={`${port.protocol}-${port.portid}`}
                  className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1.5 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-400 font-mono font-bold text-xs border border-sky-800/50">
                        {port.portid}/{port.protocol}
                      </span>
                      <span className="font-semibold text-white text-xs">
                        {port.service?.name || 'unknown service'}
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] uppercase font-bold border border-emerald-800/40">
                      {port.state}
                    </span>
                  </div>
                  {(port.service?.product || port.service?.version) && (
                    <p className="text-xs text-zinc-300 font-mono">
                      {port.service?.product} {port.service?.version} {port.service?.extrainfo && `(${port.service.extrainfo})`}
                    </p>
                  )}
                  {port.service?.cpe && port.service.cpe.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {port.service.cpe.map((cpe, idx) => (
                        <span key={idx} className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                          {cpe}
                        </span>
                      ))}
                    </div>
                  )}
                  {port.scripts && port.scripts.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-zinc-800/60 text-[11px] font-mono text-amber-300/90 whitespace-pre-wrap bg-black/40 p-2 rounded">
                      {port.scripts.map((s) => `${s.id}:\n${s.output}`).join('\n\n')}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TRACEROUTE TAB */}
        {activeTab === 'trace' && (
          <div className="space-y-4">
            {host?.trace?.hops && host.trace.hops.length > 0 ? (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
                {host.trace.hops.map((hop, idx) => {
                  const isDestination = idx === (host.trace?.hops.length || 1) - 1;
                  return (
                    <div key={idx} className="relative group">
                      <div
                        className={`absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 ${
                          isDestination
                            ? 'bg-emerald-500 border-emerald-300'
                            : 'bg-zinc-900 border-sky-400'
                        }`}
                      />
                      <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-sky-400">Hop #{hop.ttl}</span>
                          <span className="font-mono text-zinc-400">
                            {hop.rtt !== undefined ? `${hop.rtt.toFixed(2)} ms` : 'N/A'}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-white mt-1 font-semibold">{hop.ipaddr}</p>
                        {hop.host && <p className="text-[11px] text-zinc-400">{hop.host}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-zinc-500">
                <p>No traceroute hops recorded for this target.</p>
                <p className="text-xs mt-1 text-zinc-600">Scan was likely executed without --traceroute</p>
              </div>
            )}
          </div>
        )}

        {/* SCRIPTS TAB */}
        {activeTab === 'scripts' && (
          <div className="space-y-3">
            {host?.hostscripts && host.hostscripts.length > 0 ? (
              host.hostscripts.map((script, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-sky-400">{script.id}</span>
                  </div>
                  <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap bg-black/40 p-2.5 rounded border border-zinc-800 overflow-x-auto">
                    {script.output}
                  </pre>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-zinc-500">
                <p>No host scripts executed for this target.</p>
              </div>
            )}
          </div>
        )}

        {/* NOTES & TAGS TAB */}
        {activeTab === 'notes' && (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Tag size={13} className="text-sky-400" />
                <span>Custom Tags</span>
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-1 rounded bg-zinc-800 text-zinc-200 text-xs font-mono flex items-center gap-1.5 border border-zinc-700"
                  >
                    {t}
                    <button
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-rose-400"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Type a tag and press Enter (e.g. Prod, DMZ, Review)..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare size={13} className="text-emerald-400" />
                <span>Security Analyst Notes</span>
              </label>
              <textarea
                rows={5}
                placeholder="Add comments or investigation findings on this host..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-sky-500 font-sans"
              />
              <button
                onClick={handleSaveComment}
                className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow transition-colors"
              >
                Save Notes
              </button>
            </div>
          </div>
        )}

        {/* CUSTOM INJECTED TABS */}
        {customTabs.map((ct) => {
          if (activeTab !== ct.id || !host) return null;
          return (
            <div key={ct.id} className="space-y-4">
              {ct.render(host, handleUpdateHostInternal)}
            </div>
          );
        })}
      </div>
    </aside>
    </div>
  );
}

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Minus, 
  Play, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft, 
  Trash2, 
  User, 
  Shield, 
  Skull, 
  Info, 
  X,
  Zap,
  TrendingUp,
  TrendingDown,
  BookOpen,
  Save,
  Download,
  Upload,
  ArrowDown,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { Combatant, CombatantType, StyleRank, Condition, ActiveCondition } from './types';
import { STYLE_RANKS, INITIAL_CONDITIONS } from './constants';

export default function App() {
  const [combatants, setCombatants] = useState<Combatant[]>([]);
  const [conditions, setConditions] = useState<Condition[]>(INITIAL_CONDITIONS);
  const [isCombatStarted, setIsCombatStarted] = useState(false);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'combat' | 'conditions' | 'rules'>('combat');
  const [conditionToDelete, setConditionToDelete] = useState<string | null>(null);
  const [isConditionsMinimized, setIsConditionsMinimized] = useState(false);
  const [showOnlyFinalPenalties, setShowOnlyFinalPenalties] = useState(false);
  const [hoveredCondition, setHoveredCondition] = useState<string | null>(null);
  const [hoveredPenaltyIdx, setHoveredPenaltyIdx] = useState<number | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light' | 'projector'>('dark');
  
  // Form state
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<CombatantType>(CombatantType.PLAYER);
  const [newInitiative, setNewInitiative] = useState(0);

  // Condition Form state
  const [newConditionName, setNewConditionName] = useState('');
  const [newConditionDesc, setNewConditionDesc] = useState('');
  const [newConditionSummary, setNewConditionSummary] = useState('');

  const listRef = React.useRef<HTMLDivElement>(null);

  const sortedCombatants = useMemo(() => {
    return [...combatants].sort((a, b) => b.initiative - a.initiative || a.name.localeCompare(b.name));
  }, [combatants]);

  const currentCombatant = sortedCombatants[currentTurnIndex];

  const migrateState = (data: any) => {
    let migratedCombatants = data.combatants || [];
    let migratedConditions = data.conditions || [];

    if (data.combatants) {
      migratedCombatants = data.combatants.map((c: any) => ({
        ...c,
        activeConditions: (c.activeConditions || []).map((ac: any) => 
          typeof ac === 'string' ? { conditionId: ac, remainingTurns: null, isManual: true } : { ...ac, isManual: ac.isManual ?? true }
        )
      }));
    }

    if (data.conditions) {
      migratedConditions = data.conditions.map((c: any) => {
        const initial = INITIAL_CONDITIONS.find(ic => ic.id === c.id);
        if (initial) {
          return { ...c, description: initial.description, summary: initial.summary };
        }
        return c;
      });
      
      const newInitialConditions = INITIAL_CONDITIONS.filter(
        ic => !migratedConditions.some((mc: any) => mc.id === ic.id)
      );
      migratedConditions = [...migratedConditions, ...newInitialConditions];
    }

    return { combatants: migratedCombatants, conditions: migratedConditions };
  };

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('rpg_combat_state');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        const { combatants: mCombatants, conditions: mConditions } = migrateState(data);
        setCombatants(mCombatants);
        setConditions(mConditions);
        if (data.theme) setTheme(data.theme);
      } catch (e) {
        console.error("Failed to load state", e);
      }
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const saveState = () => {
    const state = { combatants, conditions, theme };
    localStorage.setItem('rpg_combat_state', JSON.stringify(state));
    alert("Estado do combate salvo no navegador!");
  };

  const loadState = () => {
    const saved = localStorage.getItem('rpg_combat_state');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        const { combatants: mCombatants, conditions: mConditions } = migrateState(data);
        setCombatants(mCombatants);
        setConditions(mConditions);
        if (data.theme) setTheme(data.theme);
        alert("Estado do combate restaurado do navegador!");
      } catch (e) {
        console.error("Failed to load state", e);
      }
    }
  };

  const exportToFile = () => {
    const state = { 
      combatants, 
      conditions, 
      theme,
      exportDate: new Date().toISOString(),
      version: "1.0"
    };
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `combate-rpg-${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importFromFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        const { combatants: mCombatants, conditions: mConditions } = migrateState(data);
        
        setCombatants(mCombatants);
        setConditions(mConditions);
        if (data.theme) setTheme(data.theme);
        
        alert("Dados importados com sucesso!");
      } catch (err) {
        alert("Erro ao importar arquivo. Certifique-se de que é um arquivo JSON válido gerado por este app.");
        console.error(err);
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  const calculateTotalPenalties = (activeConditions: ActiveCondition[]) => {
    const activeConds = activeConditions.map(ac => ({
      ...ac,
      data: conditions.find(c => c.id === ac.conditionId)
    })).filter(ac => ac.data) as (ActiveCondition & { data: Condition })[];
    
    let maxDefensePenalty = 0;
    let defenseSources: string[] = [];
    
    let maxTestPenalty = 0;
    let testSources: string[] = [];
    
    let maxAttackPenalty = 0;
    let attackSources: string[] = [];
    
    let maxSkillPenalty = 0;
    let skillSources: string[] = [];
    
    let maxReflexPenalty = 0;
    let reflexSources: string[] = [];
    
    let maxInitiativePenalty = 0;
    let initiativeSources: string[] = [];
    
    let maxPerceptionPenalty = 0;
    let perceptionSources: string[] = [];
    
    let peCostIncrease = 0;
    let peSources: string[] = [];
    
    let rd = 0;
    let rdSources: string[] = [];
    
    let failureChance = 0;
    let failureSources: string[] = [];
    
    let fortification = 0;
    let fortificationSources: string[] = [];
    
    let curaAcelerada = 0;
    let curaSources: string[] = [];
    
    let recurringDamage: { label: string, sourceId: string }[] = [];
    let stateResults: { label: string, sourceId: string }[] = [];
    
    activeConds.forEach(ac => {
      const cond = ac.data;
      const summary = cond.summary || "";
      
      // Defense
      const defMatch = summary.match(/-(\d+)\s+Defesa/i);
      if (defMatch) {
        const val = parseInt(defMatch[1]);
        if (val > maxDefensePenalty) {
          maxDefensePenalty = val;
          defenseSources = [cond.id];
        } else if (val === maxDefensePenalty && val > 0) {
          defenseSources.push(cond.id);
        }
      }
      
      // d20 Penalties
      const d20Matches = summary.match(/-(\d+)d20/gi);
      if (d20Matches) {
        const val = parseInt(d20Matches[0].match(/\d+/)?.[0] || "0");
        
        const updateD20 = (currentMax: number, currentSources: string[], type: string) => {
          if (summary.toLowerCase().includes(type)) {
            if (val > currentMax) {
              return { max: val, sources: [cond.id] };
            } else if (val === currentMax && val > 0) {
              return { max: currentMax, sources: [...currentSources, cond.id] };
            }
          }
          return { max: currentMax, sources: currentSources };
        };

        const testRes = updateD20(maxTestPenalty, testSources, "testes");
        maxTestPenalty = testRes.max; testSources = testRes.sources;

        const attackRes = updateD20(maxAttackPenalty, attackSources, "ataque");
        maxAttackPenalty = attackRes.max; attackSources = attackRes.sources;

        const skillRes = updateD20(maxSkillPenalty, skillSources, "perícia");
        maxSkillPenalty = skillRes.max; skillSources = skillRes.sources;

        const reflexRes = updateD20(maxReflexPenalty, reflexSources, "reflexos");
        maxReflexPenalty = reflexRes.max; reflexSources = reflexRes.sources;

        const initRes = updateD20(maxInitiativePenalty, initiativeSources, "iniciativa");
        maxInitiativePenalty = initRes.max; initiativeSources = initRes.sources;

        const percRes = updateD20(maxPerceptionPenalty, perceptionSources, "percepção");
        maxPerceptionPenalty = percRes.max; perceptionSources = percRes.sources;
      }
      
      // PE Cost
      const peMatch = summary.match(/\+(\d+)\s+Custo\s+PE/i);
      if (peMatch) {
        peCostIncrease += parseInt(peMatch[1]);
        peSources.push(cond.id);
      }
      
      // RD
      const rdMatch = summary.match(/RD\s+(\d+)/i);
      if (rdMatch) {
        rd += parseInt(rdMatch[1]);
        rdSources.push(cond.id);
      }

      // Failure Chance
      const failMatch = summary.match(/(\d+)%\s+chance\s+de\s+falha/i);
      if (failMatch) {
        failureChance += parseInt(failMatch[1]);
        failureSources.push(cond.id);
      }

      // Fortification
      const fortMatch = summary.match(/fortificação\s+(\d+)%/i);
      if (fortMatch) {
        fortification += parseInt(fortMatch[1]);
        fortificationSources.push(cond.id);
      }

      // Cura Acelerada
      const curaMatch = summary.match(/cura\s+acelerada\s+(\d+)/i);
      if (curaMatch) {
        curaAcelerada += parseInt(curaMatch[1]);
        curaSources.push(cond.id);
      }
      
      // Recurring Damage
      const dmgMatch = summary.match(/\d+d\d+\s+Dano/i);
      if (dmgMatch) {
        recurringDamage.push({ label: dmgMatch[0], sourceId: cond.id });
      }
      
      // States
      const commonStates = ["Desprevenido", "Imóvel", "Lento", "Vulnerável", "Indefeso", "Inconsciente", "Sem ações", "Sem fôlego", "Morrendo", "Machucado", "Caído", "Cego", "Confuso", "Debilitado", "Doente", "Em chamas", "Enjoado", "Enredado", "Envenenado", "Esmorecido", "Exausto", "Fascinado", "Fatigado", "Fraco", "Frustrado", "Paralisado", "Pasmo", "Petrificado", "Sangrando", "Surdo", "Surpreendido"];
      commonStates.forEach(s => {
        if (summary.includes(s) || cond.name.includes(s)) {
          stateResults.push({ label: s, sourceId: cond.id });
        }
      });
    });
    
    const results: { label: string, sourceIds: string[] }[] = [];
    if (maxDefensePenalty > 0) results.push({ label: `-${maxDefensePenalty} Defesa`, sourceIds: defenseSources });
    if (maxTestPenalty > 0) results.push({ label: `-${maxTestPenalty}d20 em Testes`, sourceIds: testSources });
    if (maxAttackPenalty > 0) results.push({ label: `-${maxAttackPenalty}d20 em Ataque`, sourceIds: attackSources });
    if (maxSkillPenalty > 0) results.push({ label: `-${maxSkillPenalty}d20 em Perícia`, sourceIds: skillSources });
    if (maxReflexPenalty > 0) results.push({ label: `-${maxReflexPenalty}d20 em Reflexos`, sourceIds: reflexSources });
    if (maxInitiativePenalty > 0) results.push({ label: `-${maxInitiativePenalty}d20 em Iniciativa`, sourceIds: initiativeSources });
    if (maxPerceptionPenalty > 0) results.push({ label: `-${maxPerceptionPenalty}d20 em Percepção`, sourceIds: perceptionSources });
    if (peCostIncrease > 0) results.push({ label: `+${peCostIncrease} Custo PE`, sourceIds: peSources });
    if (rd > 0) results.push({ label: `RD ${rd}`, sourceIds: rdSources });
    if (failureChance > 0) results.push({ label: `${Math.min(75, failureChance)}% Chance de Falha`, sourceIds: failureSources });
    if (fortification > 0) results.push({ label: `Fortificação ${fortification}%`, sourceIds: fortificationSources });
    if (curaAcelerada > 0) results.push({ label: `Cura Acelerada ${curaAcelerada}`, sourceIds: curaSources });
    
    recurringDamage.forEach(d => results.push({ label: d.label, sourceIds: [d.sourceId] }));
    
    // Group states by name to avoid duplicates but keep all sources
    const stateMap = new Map<string, string[]>();
    stateResults.forEach(sr => {
      const existing = stateMap.get(sr.label) || [];
      stateMap.set(sr.label, [...existing, sr.sourceId]);
    });
    stateMap.forEach((ids, label) => results.push({ label, sourceIds: ids }));
    
    // Ensure all conditions are represented
    const representedIds = new Set<string>();
    results.forEach(r => r.sourceIds.forEach(id => representedIds.add(id)));
    
    activeConds.forEach(ac => {
      if (!representedIds.has(ac.conditionId)) {
        results.push({ label: ac.data.name, sourceIds: [ac.conditionId] });
      }
    });

    return results;
  };

  const scrollToNext = () => {
    if (listRef.current) {
      const children = listRef.current.children;
      if (children.length > 0) {
        // Find the first element not fully in view or just scroll down a bit
        listRef.current.scrollBy({ top: 100, behavior: 'smooth' });
      }
    }
  };

  const addCombatant = () => {
    if (!newName.trim()) return;
    const newCombatant: Combatant = {
      id: crypto.randomUUID(),
      name: newName,
      type: newType,
      initiative: newInitiative,
      styleRank: StyleRank.D,
      activeConditions: [],
    };
    setCombatants([...combatants, newCombatant]);
    setNewName('');
    setNewInitiative(0);
  };

  const removeCombatant = (id: string) => {
    setCombatants(combatants.filter(c => c.id !== id));
  };

  const updateInitiative = (id: string, amount: number) => {
    setCombatants(combatants.map(c => 
      c.id === id ? { ...c, initiative: c.initiative + amount } : c
    ));
  };

  const updateStyle = (id: string, direction: 'up' | 'down' | 'reset' | 'minus') => {
    setCombatants(combatants.map(c => {
      if (c.id !== id) return c;
      let nextRank = c.styleRank;
      if (direction === 'up' && nextRank < StyleRank.SSS) nextRank++;
      if (direction === 'down' && nextRank > StyleRank.D) nextRank -= 2;
      if (direction === 'minus' && nextRank > StyleRank.D) nextRank--;
      if (direction === 'reset') nextRank = StyleRank.D;
      
      // Clamp values
      if (nextRank < StyleRank.D) nextRank = StyleRank.D;
      if (nextRank > StyleRank.SSS) nextRank = StyleRank.SSS;
      
      return { ...c, styleRank: nextRank };
    }));
  };

  const toggleCondition = (combatantId: string, conditionId: string) => {
    setCombatants(prevCombatants => {
      return prevCombatants.map(c => {
        if (c.id !== combatantId) return c;

        const isCurrentlyActive = c.activeConditions.some(ac => ac.conditionId === conditionId && ac.isManual);
        let newActiveConditions = [...c.activeConditions];

        const addConditionRecursive = (id: string, isManual: boolean, list: ActiveCondition[]) => {
          const existing = list.find(ac => ac.conditionId === id);
          if (existing) {
            if (isManual) existing.isManual = true;
            return list;
          }
          
          const condData = conditions.find(cond => cond.id === id);
          const newList = [...list, { conditionId: id, remainingTurns: null, isManual }];
          
          if (condData?.causes) {
            condData.causes.forEach(causeId => {
              addConditionRecursive(causeId, false, newList);
            });
          }
          return newList;
        };

        const removeConditionRecursive = (id: string, isManual: boolean, list: ActiveCondition[]) => {
          const index = list.findIndex(ac => ac.conditionId === id);
          if (index === -1) return list;

          if (isManual) {
            list[index].isManual = false;
          }

          // A condition should be removed if:
          // 1. It's not manual
          // 2. AND it's not caused by any OTHER active condition
          const isStillCaused = (targetId: string, currentList: ActiveCondition[]) => {
            return currentList.some(ac => {
              if (ac.conditionId === targetId) return false;
              const condData = conditions.find(cond => cond.id === ac.conditionId);
              return condData?.causes?.includes(targetId);
            });
          };

          const toCheck = [id];
          while (toCheck.length > 0) {
            const currentId = toCheck.shift()!;
            const idx = list.findIndex(ac => ac.conditionId === currentId);
            if (idx !== -1 && !list[idx].isManual && !isStillCaused(currentId, list)) {
              const condData = conditions.find(cond => cond.id === currentId);
              list.splice(idx, 1);
              if (condData?.causes) {
                toCheck.push(...condData.causes);
              }
            }
          }
          return list;
        };

        if (!isCurrentlyActive) {
          // Adding
          newActiveConditions = addConditionRecursive(conditionId, true, newActiveConditions);
        } else {
          // Removing
          newActiveConditions = removeConditionRecursive(conditionId, true, newActiveConditions);
        }

        return { ...c, activeConditions: newActiveConditions };
      });
    });
  };

  const updateConditionDuration = (combatantId: string, conditionId: string, delta: number) => {
    setCombatants(combatants.map(c => {
      if (c.id !== combatantId) return c;
      return {
        ...c,
        activeConditions: c.activeConditions.map(ac => {
          if (ac.conditionId !== conditionId) return ac;
          const current = ac.remainingTurns === null ? 1 : ac.remainingTurns;
          const next = Math.max(1, current + delta);
          return { ...ac, remainingTurns: next };
        })
      };
    }));
  };

  const nextTurn = () => {
    // Decrement durations for the combatant whose turn just ended
    const endingCombatant = sortedCombatants[currentTurnIndex];
    if (endingCombatant) {
      setCombatants(prev => prev.map(c => {
        if (c.id !== endingCombatant.id) return c;
        
        let newConditions = c.activeConditions
          .map(ac => ({
            ...ac,
            remainingTurns: ac.remainingTurns !== null ? ac.remainingTurns - 1 : null
          }))
          .filter(ac => ac.remainingTurns === null || ac.remainingTurns > 0);

        // After duration removal, we need to re-check dependencies
        // If a manual condition expired, its caused conditions might need to go
        const isStillCaused = (targetId: string, currentList: ActiveCondition[]) => {
          return currentList.some(ac => {
            const condData = conditions.find(cond => cond.id === ac.conditionId);
            return condData?.causes?.includes(targetId);
          });
        };

        const cleanupDependencies = (list: ActiveCondition[]) => {
          let changed = true;
          while (changed) {
            changed = false;
            for (let i = 0; i < list.length; i++) {
              const ac = list[i];
              if (!ac.isManual && !isStillCaused(ac.conditionId, list)) {
                list.splice(i, 1);
                changed = true;
                break;
              }
            }
          }
          return list;
        };

        return {
          ...c,
          activeConditions: cleanupDependencies(newConditions)
        };
      }));
    }
    setCurrentTurnIndex((prev) => (prev + 1) % sortedCombatants.length);
  };

  const prevTurn = () => {
    setCurrentTurnIndex((prev) => (prev - 1 + sortedCombatants.length) % sortedCombatants.length);
  };

  const resetConditions = () => {
    if (confirm("Deseja resetar a lista de condições para os padrões do Ordem Paranormal? Isso apagará suas condições customizadas.")) {
      setConditions(INITIAL_CONDITIONS);
      const saved = localStorage.getItem('rpg_combat_state');
      if (saved) {
        const data = JSON.parse(saved);
        data.conditions = INITIAL_CONDITIONS;
        localStorage.setItem('rpg_combat_state', JSON.stringify(data));
      }
    }
  };

  const addCondition = () => {
    if (!newConditionName.trim()) return;
    const newCondition: Condition = {
      id: crypto.randomUUID(),
      name: newConditionName,
      description: newConditionDesc,
      summary: newConditionSummary,
    };
    setConditions([...conditions, newCondition]);
    setNewConditionName('');
    setNewConditionDesc('');
    setNewConditionSummary('');
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id));
    setConditionToDelete(null);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
              <Zap className="text-white fill-current" size={24} />
            </div>
            <h1 className="text-lg sm:text-xl font-display font-bold tracking-tight">
              Iniciativa <span className="text-primary">& Estilo</span>
            </h1>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={saveState}
              className="p-1.5 sm:p-2 text-zinc-500 hover:text-zinc-100 transition-colors"
              title="Salvar no Navegador"
            >
              <Save size={18} className="sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={loadState}
              className="p-1.5 sm:p-2 text-zinc-500 hover:text-zinc-100 transition-colors"
              title="Carregar do Navegador"
            >
              <RotateCcw size={18} className="sm:w-5 sm:h-5" />
            </button>
            
            <div className="w-px h-6 bg-zinc-800 mx-1 sm:mx-2" />

            <button
              onClick={exportToFile}
              className="p-1.5 sm:p-2 text-zinc-500 hover:text-zinc-100 transition-colors"
              title="Exportar Arquivo (.json)"
            >
              <Download size={18} className="sm:w-5 sm:h-5" />
            </button>
            
            <label className="p-1.5 sm:p-2 text-zinc-500 hover:text-zinc-100 transition-colors cursor-pointer" title="Importar Arquivo (.json)">
              <Upload size={18} className="sm:w-5 sm:h-5" />
              <input 
                type="file" 
                accept=".json" 
                className="hidden" 
                onChange={importFromFile}
              />
            </label>

            <div className="w-px h-6 bg-zinc-800 mx-1 sm:mx-2" />
            
            {/* Theme Switcher */}
            <div className="flex bg-zinc-950 p-1 rounded-full border border-zinc-800 gap-0.5">
              {[
                { id: 'dark', icon: Moon, label: 'Escuro' },
                { id: 'light', icon: Sun, label: 'Claro' },
                { id: 'projector', icon: Monitor, label: 'Projetor' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id as any)}
                  className={`p-1.5 rounded-full transition-all ${
                    theme === t.id 
                      ? 'bg-zinc-800 text-zinc-50 shadow-inner' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  title={t.label}
                >
                  <t.icon size={14} className="sm:w-4 sm:h-4" />
                </button>
              ))}
            </div>

            <div className="w-px h-6 bg-zinc-800 mx-1 sm:mx-2" />
            <nav className="flex gap-0.5 sm:gap-1 bg-zinc-950 p-1 rounded-full border border-zinc-800">
            {[
              { id: 'combat', label: 'Combate', icon: Play },
              { id: 'conditions', label: 'Condições', icon: Info },
              { id: 'rules', label: 'Regras', icon: BookOpen },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                  activeTab === tab.id 
                    ? 'bg-zinc-800 text-zinc-100 shadow-inner' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <tab.icon size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden xs:inline sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'combat' && (
            <motion.div
              key="combat-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {!isCombatStarted ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Setup Form */}
                  <div className="lg:col-span-1 space-y-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                      <h2 className="text-base sm:text-lg font-display font-semibold mb-4 flex items-center gap-2">
                        <Plus size={18} className="text-primary" />
                        Adicionar Combatente
                      </h2>
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1 block">Nome</label>
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Ex: Felps Rubinho da Silva..."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1 block">Tipo</label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: CombatantType.PLAYER, label: 'Jogador', icon: User, color: 'text-blue-400' },
                              { id: CombatantType.ALLY, label: 'Aliado', icon: Shield, color: 'text-green-400' },
                              { id: CombatantType.ENEMY, label: 'Inimigo', icon: Skull, color: 'text-red-500' },
                            ].map((type) => (
                              <button
                                key={type.id}
                                onClick={() => setNewType(type.id)}
                                className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                                  newType === type.id 
                                    ? 'bg-zinc-800 border-zinc-600 text-zinc-50' 
                                    : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                                }`}
                              >
                                <type.icon size={18} className={newType === type.id ? type.color : ''} />
                                <span className="text-[10px] font-bold uppercase">{type.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1 block">Iniciativa</label>
                          <div className="flex flex-col gap-2">
                            <input
                              type="number"
                              value={newInitiative}
                              onChange={(e) => setNewInitiative(parseInt(e.target.value) || 0)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-center text-lg font-bold"
                            />
                            <div className="flex flex-wrap gap-1 justify-center bg-zinc-950/50 p-1.5 rounded-xl border border-zinc-800/50">
                              {[-10, -5, -1].map(val => (
                                <button
                                  key={val}
                                  onClick={() => setNewInitiative(prev => prev + val)}
                                  className="flex-1 min-w-[40px] h-9 flex items-center justify-center bg-zinc-900 border border-zinc-800 hover:bg-red-950/30 hover:border-red-500/50 rounded-lg text-[10px] font-bold transition-all text-zinc-500 hover:text-red-500"
                                >
                                  {val}
                                </button>
                              ))}
                              <div className="w-px h-6 bg-zinc-800 mx-0.5 self-center" />
                              {[1, 5, 10].map(val => (
                                <button
                                  key={val}
                                  onClick={() => setNewInitiative(prev => prev + val)}
                                  className="flex-1 min-w-[40px] h-9 flex items-center justify-center bg-zinc-900 border border-zinc-800 hover:bg-green-950/30 hover:border-green-500/50 rounded-lg text-[10px] font-bold transition-all text-zinc-500 hover:text-green-500"
                                >
                                  +{val}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={addCombatant}
                          disabled={!newName.trim()}
                          className="w-full bg-primary hover:opacity-90 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                        >
                          <Plus size={20} />
                          Adicionar à Fila
                        </button>
                      </div>
                    </div>

                    {combatants.length > 0 && (
                          <button
                            onClick={() => setIsCombatStarted(true)}
                            className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl"
                          >
                          <Play size={24} fill="currentColor" />
                          INICIAR COMBATE
                        </button>
                    )}
                  </div>

                  {/* Initiative List */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between px-2 gap-2">
                      <h2 className="text-base sm:text-lg font-display font-semibold flex items-center gap-2">
                        Ordem de Iniciativa
                        <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full">{combatants.length}</span>
                      </h2>
                      <div className="flex items-center gap-2 sm:gap-3">
                        {combatants.length > 5 && (
                          <button 
                            onClick={scrollToNext}
                            className="text-zinc-500 hover:text-zinc-100 transition-colors flex items-center gap-1 text-sm bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-800"
                          >
                            <ArrowDown size={14} />
                            Rolar
                          </button>
                        )}
                        {combatants.length > 0 && (
                          <button 
                            onClick={() => setCombatants([])}
                            className="text-zinc-500 hover:text-primary transition-colors flex items-center gap-1 text-sm"
                          >
                            <RotateCcw size={14} />
                            Limpar Tudo
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar" ref={listRef}>
                      {sortedCombatants.length === 0 ? (
                        <div className="bg-zinc-900/50 border-2 border-dashed border-zinc-800 rounded-2xl p-12 flex flex-col items-center justify-center text-zinc-500">
                          <User size={48} className="mb-4 opacity-20" />
                          <p>Nenhum combatente na arena.</p>
                          <p className="text-sm">Adicione jogadores, aliados ou inimigos para começar.</p>
                        </div>
                      ) : (
                        sortedCombatants.map((c, idx) => (
                          <motion.div
                            layout
                            key={c.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`group bg-zinc-900 border ${idx === 0 ? 'border-primary/50 ring-1 ring-primary/20' : 'border-zinc-800'} rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-zinc-800/80`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center font-mono font-bold text-lg ${
                                c.type === CombatantType.PLAYER ? 'bg-blue-500/10 text-blue-400' :
                                c.type === CombatantType.ALLY ? 'bg-green-500/10 text-green-400' :
                                'bg-red-500/10 text-red-500'
                              }`}>
                                {c.initiative}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-bold text-zinc-100">{c.name}</h3>
                                  <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                                    c.type === CombatantType.PLAYER ? 'bg-blue-500/20 text-blue-400' :
                                    c.type === CombatantType.ALLY ? 'bg-green-500/20 text-green-400' :
                                    'bg-red-500/20 text-red-500'
                                  }`}>
                                    {c.type}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {c.activeConditions.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {calculateTotalPenalties(c.activeConditions).slice(0, 3).map((p, i) => (
                                        <span key={i} className="text-[8px] px-1 bg-zinc-800 text-zinc-400 rounded border border-zinc-700">
                                          {p}
                                        </span>
                                      ))}
                                      {calculateTotalPenalties(c.activeConditions).length > 3 && (
                                        <span className="text-[8px] text-zinc-600">...</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-zinc-600 italic">Sem condições</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 border-t border-zinc-800/50 sm:border-0 pt-3 sm:pt-0 w-full sm:w-auto">
                              <div className="flex items-center gap-1 justify-center flex-1 sm:flex-none">
                                <div className="flex items-center gap-1">
                                  {[-10, -5, -1].map(v => (
                                    <button
                                      key={v}
                                      onClick={() => updateInitiative(c.id, v)}
                                      className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-zinc-950 hover:bg-red-500/20 text-zinc-500 hover:text-red-500 text-[10px] font-bold transition-all"
                                    >
                                      {v}
                                    </button>
                                  ))}
                                </div>
                                <div className="w-px h-5 bg-zinc-800 mx-0.5" />
                                <div className="flex items-center gap-1">
                                  {[1, 5, 10].map(v => (
                                    <button
                                      key={v}
                                      onClick={() => updateInitiative(c.id, v)}
                                      className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-zinc-950 hover:bg-green-900/30 text-zinc-500 hover:text-green-400 text-[10px] font-bold transition-all"
                                    >
                                      +{v}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <button
                                onClick={() => removeCombatant(c.id)}
                                className="p-2 text-zinc-600 hover:text-primary transition-colors sm:opacity-0 sm:group-hover:opacity-100 shrink-0"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Active Combat Mode - Dedicated Dark Theme */
                <div className="fixed inset-0 z-[60] bg-zinc-950 flex flex-col p-4 md:p-6 overflow-y-auto custom-scrollbar">
                  <div className="max-w-5xl mx-auto w-full flex flex-col gap-4 min-h-full">
                    <div className="flex items-center justify-between shrink-0">
                      <button 
                        onClick={() => setIsCombatStarted(false)}
                        className="flex items-center gap-2 text-zinc-600 hover:text-zinc-400 transition-colors bg-zinc-900/50 px-3 py-1.5 rounded-xl border border-zinc-800 text-sm"
                      >
                        <ChevronLeft size={18} />
                        Sair
                      </button>
                      <div className="flex items-center gap-4">
                        <div className="text-zinc-600 font-mono text-xs bg-zinc-900/50 px-3 py-1.5 rounded-xl border border-zinc-800">
                          Turno {currentTurnIndex + 1} / {sortedCombatants.length}
                        </div>
                        <button
                          onClick={saveState}
                          className="p-1.5 text-zinc-600 hover:text-zinc-100 transition-colors bg-zinc-900/50 rounded-xl border border-zinc-800"
                          title="Salvar no Navegador"
                        >
                          <Save size={18} />
                        </button>
                        <button
                          onClick={exportToFile}
                          className="p-1.5 text-zinc-600 hover:text-zinc-100 transition-colors bg-zinc-900/50 rounded-xl border border-zinc-800"
                          title="Exportar Arquivo"
                        >
                          <Download size={18} />
                        </button>
                        <label 
                          className="p-1.5 text-zinc-600 hover:text-zinc-100 transition-colors bg-zinc-900/50 rounded-xl border border-zinc-800 cursor-pointer" 
                          title="Importar Arquivo"
                        >
                          <Upload size={18} />
                          <input 
                            type="file" 
                            accept=".json" 
                            className="hidden" 
                            onChange={importFromFile}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 pb-8">
                      <div className="grid grid-cols-2 gap-3 shrink-0">
                        <button
                          onClick={prevTurn}
                          className="bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 py-3 rounded-2xl flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-100 transition-all group"
                        >
                          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                          <span className="text-xs font-bold uppercase tracking-wider">Voltar</span>
                        </button>
                        <button
                          onClick={nextTurn}
                          className="bg-primary hover:opacity-90 py-3 rounded-2xl flex items-center justify-center gap-2 text-zinc-100 transition-all group shadow-lg shadow-primary/20"
                        >
                          <span className="text-xs font-bold uppercase tracking-wider">Próximo</span>
                          <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>

                      <AnimatePresence mode="wait">
                        <motion.div
                          key={currentCombatant.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ 
                            opacity: 1, 
                            y: 0,
                            boxShadow: [
                              "0 0 0px rgba(0,0,0,0)",
                              currentCombatant.type === CombatantType.PLAYER ? "0 0 30px rgba(59, 130, 246, 0.15)" :
                              currentCombatant.type === CombatantType.ALLY ? "0 0 30px rgba(34, 197, 94, 0.15)" :
                              "0 0 30px rgba(239, 68, 68, 0.15)",
                              "0 0 0px rgba(0,0,0,0)"
                            ]
                          }}
                          transition={{
                            opacity: { duration: 0.4 },
                            y: { duration: 0.4 },
                            boxShadow: { 
                              duration: 3, 
                              repeat: Infinity, 
                              ease: "easeInOut" 
                            }
                          }}
                          exit={{ opacity: 0, y: -20 }}
                          className="bg-zinc-950 border border-zinc-800 rounded-[2rem] p-4 md:p-6 shadow-2xl relative overflow-hidden ring-1 ring-zinc-800/50 flex flex-col gap-6"
                        >
                          {/* Background Glow */}
                          <div className={`absolute -top-24 -left-24 w-64 h-64 blur-[120px] opacity-20 rounded-full ${
                            currentCombatant.type === CombatantType.PLAYER ? 'bg-blue-500' :
                            currentCombatant.type === CombatantType.ALLY ? 'bg-green-500' :
                            'bg-red-500'
                          }`} />

                          <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                            <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.3em] border ${
                              currentCombatant.type === CombatantType.PLAYER ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                              currentCombatant.type === CombatantType.ALLY ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                              'bg-red-500/10 border-red-500/30 text-red-500'
                            }`}>
                              {currentCombatant.type}
                            </div>

                            <h2 className="text-2xl sm:text-4xl md:text-6xl font-display font-black tracking-tighter text-zinc-100 drop-shadow-2xl line-clamp-2 break-all px-4">
                              {currentCombatant.name}
                            </h2>

                            <div className="flex items-center justify-center gap-6">
                              <div className="flex flex-col items-center">
                                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Iniciativa</span>
                                <span className="text-3xl font-mono font-bold text-zinc-300">{currentCombatant.initiative}</span>
                              </div>
                              
                              {currentCombatant.type === CombatantType.PLAYER && (
                                <div className="flex items-center gap-3 bg-zinc-900/30 p-3 rounded-2xl border border-zinc-800/50">
                                  <span className={`text-4xl font-black italic style-rank-${STYLE_RANKS[currentCombatant.styleRank].label.toLowerCase()}`}>
                                    {STYLE_RANKS[currentCombatant.styleRank].label}
                                  </span>
                                  <div className="text-left border-l border-zinc-800 pl-3">
                                    <div className={`text-base font-bold style-rank-${STYLE_RANKS[currentCombatant.styleRank].label.toLowerCase()}`}>
                                      {STYLE_RANKS[currentCombatant.styleRank].name}
                                    </div>
                                    <div className="text-[9px] text-zinc-500 max-w-[120px] leading-tight">
                                      {STYLE_RANKS[currentCombatant.styleRank].bonus}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Conditions in Combat Mode */}
                            <div className="w-full max-w-xl space-y-4 px-2">
                              <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Condições Aplicadas</span>
                                  <span className="bg-zinc-800 text-zinc-400 text-[10px] px-1.5 py-0.5 rounded-full">
                                    {currentCombatant.activeConditions.length}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <button 
                                    onClick={() => setShowOnlyFinalPenalties(!showOnlyFinalPenalties)}
                                    className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 transition-colors ${showOnlyFinalPenalties ? 'text-primary' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    title="Alternar entre ver todas as condições ou apenas o resultado final"
                                  >
                                    {showOnlyFinalPenalties ? 'Ver Tudo' : 'Limpar UI'}
                                  </button>
                        <button 
                          onClick={() => setIsConditionsMinimized(!isConditionsMinimized)}
                          className="text-[10px] font-bold text-zinc-400 hover:text-zinc-100 transition-colors uppercase tracking-widest flex items-center gap-1"
                        >
                                    {isConditionsMinimized ? 'Expandir' : 'Minimizar'}
                                    {isConditionsMinimized ? <ChevronRight size={12} /> : <ArrowDown size={12} />}
                                  </button>
                                </div>
                              </div>

                              {!isConditionsMinimized && (
                                <div className="space-y-4">
                                  {!showOnlyFinalPenalties && (
                                    <div className="flex flex-wrap justify-center gap-2">
                                      {conditions.map(cond => {
                                        const active = currentCombatant.activeConditions.find(ac => ac.conditionId === cond.id);
                                        return (
                                          <div key={cond.id} className="flex flex-col gap-1 relative">
                                            <button
                                              onMouseEnter={() => setHoveredCondition(cond.id)}
                                              onMouseLeave={() => setHoveredCondition(null)}
                                              onClick={() => toggleCondition(currentCombatant.id, cond.id)}
                                              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border flex items-center gap-2 ${
                                                active
                                                  ? active.isManual 
                                                    ? 'bg-primary border-primary text-white shadow-[0_0_15px_rgba(255,52,99,0.4)]'
                                                    : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                                                  : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                                              }`}
                                            >
                                              {active && <Zap size={10} className={active.isManual ? "fill-current" : "text-zinc-500"} />}
                                              {cond.name}
                                              {!active?.isManual && active && <span className="text-[8px] opacity-50">(Auto)</span>}
                                            </button>
                                            
                                            <AnimatePresence>
                                              {hoveredCondition === cond.id && (
                                                <motion.div
                                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-[70] pointer-events-none"
                                                >
                                                  <div className="text-[10px] font-bold text-primary mb-1 uppercase tracking-wider">{cond.name}</div>
                                                  <div className="text-[9px] text-zinc-400 leading-tight">{cond.description}</div>
                                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-900" />
                                                </motion.div>
                                              )}
                                            </AnimatePresence>

                                            {active && active.isManual && (
                                              <div className="flex items-center justify-center gap-1 bg-zinc-900 rounded-lg border border-zinc-800 p-1">
                                                <button 
                                                  onClick={() => updateConditionDuration(currentCombatant.id, cond.id, -1)}
                                                  className="w-5 h-5 flex items-center justify-center text-zinc-500 hover:text-zinc-100"
                                                >
                                                  <Minus size={10} />
                                                </button>
                                                <span className="text-[9px] font-mono text-zinc-300 min-w-[20px] text-center">
                                                  {active.remainingTurns === null ? '∞' : `${active.remainingTurns}t`}
                                                </span>
                                                <button 
                                                  onClick={() => updateConditionDuration(currentCombatant.id, cond.id, 1)}
                                                  className="w-5 h-5 flex items-center justify-center text-zinc-500 hover:text-zinc-100"
                                                >
                                                  <Plus size={10} />
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Consolidated Penalties */}
                                  {currentCombatant.activeConditions.length > 0 && (
                                    <div className={`bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 text-left transition-all ${showOnlyFinalPenalties ? 'ring-2 ring-primary/20' : ''}`}>
                                      <div className="flex flex-col gap-4">
                                        {!showOnlyFinalPenalties && (
                                          <div>
                                            <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Condições Ativas</div>
                                            <div className="flex flex-wrap gap-2">
                                              {currentCombatant.activeConditions.map(ac => {
                                                const cond = conditions.find(cn => cn.id === ac.conditionId);
                                                return (
                                                  <span key={ac.conditionId} className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${ac.isManual ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-900/50 text-zinc-500 border-zinc-800 italic'}`}>
                                                    {cond?.name} {!ac.isManual && '(Auto)'}
                                                  </span>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}

                                        <div>
                                          <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Resultado Final das Penalidades</div>
                                          <div className="flex flex-wrap gap-x-4 gap-y-2">
                                            {calculateTotalPenalties(currentCombatant.activeConditions).map((penalty, idx) => (
                                              <div 
                                                key={idx} 
                                                className="flex items-center gap-2 relative group/penalty"
                                                onMouseEnter={() => setHoveredPenaltyIdx(idx)}
                                                onMouseLeave={() => setHoveredPenaltyIdx(null)}
                                              >
                                                <div className="w-1 h-1 rounded-full bg-primary" />
                                                <span className="text-xs text-zinc-300 font-bold cursor-help border-b border-dashed border-zinc-700 hover:border-primary transition-colors">
                                                  {penalty.label}
                                                </span>

                                                <AnimatePresence>
                                                  {hoveredPenaltyIdx === idx && (
                                                    <motion.div
                                                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                      className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-[80] pointer-events-none"
                                                    >
                                                      {penalty.sourceIds.map(sid => {
                                                        const cond = conditions.find(c => c.id === sid);
                                                        const activeCond = currentCombatant.activeConditions.find(ac => ac.conditionId === sid);
                                                        
                                                        // Find what causes this condition if it's auto
                                                        let causingCondData = null;
                                                        if (activeCond && !activeCond.isManual) {
                                                          const causingCond = currentCombatant.activeConditions.find(ac => {
                                                            const cData = conditions.find(cd => cd.id === ac.conditionId);
                                                            return cData?.causes?.includes(sid);
                                                          });
                                                          if (causingCond) {
                                                            causingCondData = conditions.find(cd => cd.id === causingCond.conditionId);
                                                          }
                                                        }

                                                        return (
                                                          <div key={sid} className="mb-2 last:mb-0">
                                                            <div className="text-[10px] font-bold text-primary mb-1 uppercase tracking-wider">
                                                              {cond?.name} 
                                                              {activeCond && !activeCond.isManual && (
                                                                <span className="ml-1 text-[8px] opacity-70 lowercase font-normal italic text-zinc-500">(Auto)</span>
                                                              )}
                                                            </div>
                                                            <div className="text-[9px] text-zinc-400 leading-tight">{cond?.description}</div>
                                                            {causingCondData && (
                                                              <div className="mt-1 flex items-center gap-1 text-[8px] text-zinc-500 italic">
                                                                <Zap size={8} className="text-zinc-600" />
                                                                Causado por: <span className="text-zinc-400 font-bold">{causingCondData.name}</span>
                                                              </div>
                                                            )}
                                                          </div>
                                                        );
                                                      })}
                                                      <div className="absolute top-full left-4 border-8 border-transparent border-t-zinc-900" />
                                                    </motion.div>
                                                  )}
                                                </AnimatePresence>
                                              </div>
                                            ))}
                                          </div>
                                        </div>

                                        {/* Expiring Conditions Section */}
                                        {currentCombatant.activeConditions.some(ac => ac.remainingTurns !== null && ac.remainingTurns < 3) && (
                                          <div className="mt-4 pt-4 border-t border-zinc-800/50">
                                            <div className="flex items-center gap-2 mb-2">
                                              <RotateCcw size={10} className="text-amber-500" />
                                              <span className="text-[9px] font-bold text-amber-500/70 uppercase tracking-widest">Expirando em Breve</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                              {currentCombatant.activeConditions
                                                .filter(ac => ac.remainingTurns !== null && ac.remainingTurns < 3)
                                                .map(ac => {
                                                  const cond = conditions.find(cn => cn.id === ac.conditionId);
                                                  return (
                                                    <div key={ac.conditionId} className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                                                      <span className="text-[10px] font-bold text-amber-200/80">{cond?.name}</span>
                                                      <span className="text-[9px] font-mono text-amber-500 font-bold bg-amber-500/10 px-1 rounded">
                                                        {ac.remainingTurns}t
                                                      </span>
                                                    </div>
                                                  );
                                                })}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {!showOnlyFinalPenalties && (
                                        <p className="mt-4 text-[9px] text-zinc-600 italic leading-tight border-t border-zinc-800 pt-2">
                                          * Efeitos iguais não se acumulam (aplique o mais severo). Chance de falha acumula até 75%. Fortificação, RD e Cura Acelerada acumulam sem limite.
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                              {/* Initiative Controls */}
                              <div className="flex flex-col items-center gap-2 bg-zinc-900/40 p-3 rounded-2xl border border-zinc-800/50">
                                <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Iniciativa</div>
                                <div className="flex items-center gap-1.5">
                                  {[-10, -5, -1].map(v => (
                                    <button
                                      key={v}
                                      onClick={() => updateInitiative(currentCombatant.id, v)}
                                      className="w-9 h-9 bg-zinc-950 hover:bg-red-950/30 rounded-lg text-zinc-500 hover:text-red-500 border border-zinc-800 transition-all flex items-center justify-center font-mono text-[10px] font-bold"
                                    >
                                      {v}
                                    </button>
                                  ))}
                                  <div className="w-px h-6 bg-zinc-800 mx-0.5" />
                                  {[1, 5, 10].map(v => (
                                    <button
                                      key={v}
                                      onClick={() => updateInitiative(currentCombatant.id, v)}
                                      className="w-9 h-9 bg-zinc-950 hover:bg-green-950/30 rounded-lg text-zinc-500 hover:text-green-500 border border-zinc-800 transition-all flex items-center justify-center font-mono text-[10px] font-bold"
                                    >
                                      +{v}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Style Controls for Players */}
                              {currentCombatant.type === CombatantType.PLAYER && (
                                <div className="flex flex-col items-center gap-2 bg-zinc-900/40 p-3 rounded-2xl border border-zinc-800/50">
                                  <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Estilo</div>
                                  <div className="flex items-center gap-1.5">
                                    <button 
                                      onClick={() => updateStyle(currentCombatant.id, 'down')}
                                      className="w-9 h-9 bg-zinc-950 hover:bg-primary/10 rounded-lg text-zinc-600 hover:text-primary border border-zinc-800 transition-all flex flex-col items-center justify-center"
                                      title="Cair 2 níveis"
                                    >
                                      <TrendingDown size={14} />
                                    </button>
                                    <button 
                                      onClick={() => updateStyle(currentCombatant.id, 'minus')}
                                      className="w-9 h-9 bg-zinc-950 hover:bg-primary/10 rounded-lg text-zinc-600 hover:text-primary border border-zinc-800 transition-all flex flex-col items-center justify-center"
                                      title="Tirar 1 nível"
                                    >
                                      <Minus size={14} />
                                    </button>
                                    <button 
                                      onClick={() => updateStyle(currentCombatant.id, 'reset')}
                                      className="w-9 h-9 bg-zinc-950 hover:bg-zinc-800 rounded-lg text-zinc-600 hover:text-zinc-100 border border-zinc-800 transition-all flex flex-col items-center justify-center"
                                    >
                                      <RotateCcw size={14} />
                                    </button>
                                    <button 
                                      onClick={() => updateStyle(currentCombatant.id, 'up')}
                                      className="w-9 h-9 bg-zinc-950 hover:bg-green-950/30 rounded-lg text-zinc-600 hover:text-green-500 border border-zinc-800 transition-all flex flex-col items-center justify-center"
                                    >
                                      <TrendingUp size={14} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'conditions' && (
            <motion.div
              key="conditions-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Add Condition Form */}
                <div className="lg:col-span-1">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sticky top-24">
                    <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
                      <Plus size={20} className="text-primary" />
                      Nova Condição
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1 block">Nome da Condição</label>
                        <input
                          type="text"
                          value={newConditionName}
                          onChange={(e) => setNewConditionName(e.target.value)}
                          placeholder="Ex: Queimando, Atordoado..."
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1 block">Descrição</label>
                        <textarea
                          value={newConditionDesc}
                          onChange={(e) => setNewConditionDesc(e.target.value)}
                          placeholder="O que esta condição faz?"
                          rows={3}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1 block">Resumo Curto (Ex: -5 Defesa)</label>
                        <input
                          type="text"
                          value={newConditionSummary}
                          onChange={(e) => setNewConditionSummary(e.target.value)}
                          placeholder="Resumo mecânico..."
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                      </div>
                        <button
                          onClick={addCondition}
                          disabled={!newConditionName.trim()}
                          className="w-full bg-zinc-100 hover:bg-zinc-50 text-zinc-950 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                        <Plus size={20} />
                        Criar Condição
                      </button>
                    </div>
                  </div>
                </div>

                {/* Conditions Table */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h2 className="text-lg font-display font-semibold">Guia de Condições (Ordem Paranormal)</h2>
                    <button 
                      onClick={resetConditions}
                      className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <RotateCcw size={12} />
                      Resetar Padrões
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                    {conditions.map((cond) => (
                      <motion.div
                        layout
                        key={cond.id}
                        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 group hover:border-zinc-700 transition-all"
                      >
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-bold text-zinc-100">{cond.name}</h3>
                            <button 
                              onClick={() => setConditionToDelete(cond.id)}
                              className="text-zinc-600 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          {cond.summary && (
                            <div className="mb-2 inline-block px-2 py-0.5 bg-primary/10 border border-primary/20 rounded text-[10px] font-bold text-primary">
                              {cond.summary}
                            </div>
                          )}
                          <p className="text-sm text-zinc-400 leading-relaxed">{cond.description}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'rules' && (
            <motion.div
              key="rules-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center">
                    <Zap className="text-primary" size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-display font-bold">Regra Especial: O Medidor de Estilo</h2>
                    <p className="text-zinc-400">Acompanhe o nível de estilo dos jogadores durante o combate.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-green-400 flex items-center gap-2">
                      <TrendingUp size={20} />
                      Como subir o Ranking
                    </h3>
                    <ul className="space-y-3 text-sm text-zinc-300">
                      <li className="flex gap-3">
                        <span className="font-bold text-zinc-500">Ações Diferentes:</span>
                        Usar habilidade/arma diferente do turno anterior (+1 nível).
                      </li>
                      <li className="flex gap-3">
                        <span className="font-bold text-zinc-500">Acerto Crítico:</span>
                        Subir 1 nível imediatamente.
                      </li>
                      <li className="flex gap-3">
                        <span className="font-bold text-zinc-500">Matar Inimigo:</span>
                        Subir 1 nível.
                      </li>
                      <li className="flex gap-3">
                        <span className="font-bold text-zinc-500">Cenário:</span>
                        Interagir com o ambiente de forma criativa (+1 nível).
                      </li>
                      <li className="flex gap-3">
                        <span className="font-bold text-zinc-500">Provocação:</span>
                        Ação de movimento + teste (DT 20) (+1 nível).
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                      <TrendingDown size={20} />
                      Como cair o Ranking
                    </h3>
                    <ul className="space-y-3 text-sm text-zinc-300">
                      <li className="flex gap-3">
                        <span className="font-bold text-zinc-500">Sofrer Dano:</span>
                        O ranking cai 2 níveis (Ex: de S para B).
                      </li>
                      <li className="flex gap-3">
                        <span className="font-bold text-zinc-500">Repetir Ação:</span>
                        3ª vez seguida usando a mesma ação (-1 nível).
                      </li>
                      <li className="flex gap-3">
                        <span className="font-bold text-zinc-500">Inatividade:</span>
                        Turno sem causar dano ou interagir (Reseta para D).
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 gap-4">
                {STYLE_RANKS.map((rank) => (
                  <div 
                    key={rank.label}
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex items-center gap-8 hover:bg-zinc-800/50 transition-all"
                  >
                    <div className={`text-5xl font-black italic w-20 text-center style-rank-${rank.label.toLowerCase()}`}>
                      {rank.label}
                    </div>
                    <div>
                      <h4 className={`text-xl font-bold mb-1 style-rank-${rank.label.toLowerCase()}`}>
                        {rank.name}
                      </h4>
                      <p className="text-zinc-400 text-sm">
                        <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mr-2">Bônus Ativo:</span>
                        {rank.bonus}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {conditionToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-xl font-display font-bold mb-4">Excluir Condição?</h3>
              <p className="text-zinc-400 mb-8">Tem certeza que deseja remover esta condição da lista? Esta ação não pode ser desfeita.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConditionToDelete(null)}
                  className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => removeCondition(conditionToDelete)}
                  className="flex-1 py-3 rounded-xl bg-primary hover:opacity-90 font-bold transition-all"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 p-6 text-center text-zinc-600 text-xs">
        <a 
          href="https://youtu.be/dQw4w9WgXcQ?si=DuFasDHRX3rQ7oGA" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-primary transition-colors"
        >
          © 2025 Gerenciador de Iniciativa • Isso é apenas um teste
        </a>
      </footer>
    </div>
  );
}

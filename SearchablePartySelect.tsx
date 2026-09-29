import { useState, useRef, useEffect } from 'react';
import { useAppStore, type Party } from '../store';
import { Search, ChevronDown, Check, AlertCircle, X, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SearchablePartySelectProps {
  selectedPartyId?: string;
  selectedPartyName?: string;
  onSelect: (party: Party | null) => void;
  required?: boolean;
}

export function SearchablePartySelect({
  selectedPartyId,
  selectedPartyName,
  onSelect,
  required = true,
}: SearchablePartySelectProps) {
  const { parties } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  // Find currently selected party from saved parties list
  const currentParty = parties.find(
    (p) => p.id === selectedPartyId || (selectedPartyName && p.name.toLowerCase() === selectedPartyName.toLowerCase())
  );

  const displayName = currentParty ? currentParty.name : selectedPartyName || '';

  // Filter parties by search query
  const filteredParties = parties.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const handleSelectParty = (party: Party) => {
    onSelect(party);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Field */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            e.preventDefault();
            setIsOpen(true);
          } else if (e.key === 'Escape') {
            setIsOpen(false);
          }
        }}
        className={`w-full border rounded-lg px-3 py-2 flex items-center justify-between cursor-pointer bg-white transition-all select-none ${
          isOpen ? 'ring-2 ring-blue-500 border-blue-500' : 'hover:border-slate-400'
        } ${!displayName && required ? 'text-slate-400' : 'text-slate-800'}`}
      >
        <span className={`truncate block font-medium ${parties.length === 0 && !displayName ? 'text-amber-600' : ''}`}>
          {displayName || (parties.length === 0 ? 'No saved parties. Add parties in Settings.' : 'Select saved party...')}
        </span>
        <div className="flex items-center gap-1.5 ml-2 shrink-0">
          {displayName && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-blue-600' : ''
            }`}
          />
        </div>
      </div>

      {/* Hidden input for form required validation check if needed */}
      <input
        type="text"
        tabIndex={-1}
        className="opacity-0 pointer-events-none absolute bottom-0 left-0 w-full h-0"
        value={displayName}
        required={required}
        onChange={() => {}}
      />

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {parties.length === 0 ? (
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-amber-600 mb-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="text-sm font-semibold">No saved parties. Add parties in Settings.</span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                You must add at least one party in Settings before assigning investments.
              </p>
              <Link
                to="/settings"
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-lg transition-colors"
              >
                Go to Settings <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <>
              {/* Search Header */}
              <div className="p-2 border-b bg-slate-50 sticky top-0">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Type to search party..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-white border rounded-md outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (filteredParties.length > 0) {
                          handleSelectParty(filteredParties[0]);
                        }
                      } else if (e.key === 'Escape') {
                        setIsOpen(false);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Party List */}
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                {filteredParties.length > 0 ? (
                  filteredParties.map((party) => {
                    const isSelected =
                      party.id === selectedPartyId ||
                      (selectedPartyName && party.name.toLowerCase() === selectedPartyName.toLowerCase());
                    return (
                      <button
                        type="button"
                        key={party.id}
                        onClick={() => handleSelectParty(party)}
                        className={`w-full text-left px-3.5 py-2.5 text-sm flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-blue-50 text-blue-900 font-semibold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="truncate">{party.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />}
                      </button>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-sm text-slate-500">
                    No parties match "{searchTerm}"
                  </div>
                )}
              </div>

              {/* Footer info */}
              <div className="p-2 bg-slate-50 border-t flex justify-between items-center text-xs text-slate-500">
                <span>{parties.length} saved {parties.length === 1 ? 'party' : 'parties'}</span>
                <Link
                  to="/settings"
                  onClick={() => setIsOpen(false)}
                  className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                >
                  Manage Parties
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

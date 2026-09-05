import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Sparkles,
  Search,
  Calendar,
  MapPin,
  Users,
  Compass,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { Trip, PlanItem, UserProfile } from '../../types';
import { NextUpCard } from '../../components/trips/NextUpCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { formatTripDateRange, calculateTripDays } from '../../utils/dateTime';

interface TripsHomeScreenProps {
  trips: Trip[];
  user: UserProfile | null;
  nextUp: { plan: PlanItem; trip: Trip } | null;
  onSelectTrip: (tripId: string) => void;
  onNewTrip: () => void;
  onImport: () => void;
  onOpenProfile: () => void;
}

type FilterTab = 'upcoming' | 'current' | 'past' | 'archived';

export const TripsHomeScreen: React.FC<TripsHomeScreenProps> = ({
  trips,
  user,
  nextUp,
  onSelectTrip,
  onNewTrip,
  onImport,
  onOpenProfile,
}) => {
  const [activeTab, setActiveTab] = useState<FilterTab>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Filter trips based on tab & search
  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          trip.title.toLowerCase().includes(q) ||
          trip.primaryDestination.toLowerCase().includes(q) ||
          trip.additionalDestinations?.some((d) => d.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Tab filter
      if (activeTab === 'archived') return trip.isArchived;
      if (trip.isArchived) return false;

      const today = new Date().toISOString().split('T')[0];
      if (activeTab === 'current') {
        return trip.status === 'current' || (trip.startDate <= today && trip.endDate >= today);
      }
      if (activeTab === 'past') {
        return trip.status === 'completed' || trip.endDate < today;
      }
      // default: upcoming
      return trip.endDate >= today && trip.status !== 'completed';
    });
  }, [trips, activeTab, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-950 pb-24 text-slate-100">
      {/* App Header */}
      <div className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-md border-b border-slate-900/90 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-500 flex items-center justify-center text-slate-950 font-extrabold text-base shadow-sm">
            D
          </div>
          <span className="text-xl font-extrabold tracking-tight text-white">DORAGO</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-900 transition-colors"
            aria-label="Search trips"
          >
            <Search size={18} />
          </button>
          <button
            onClick={onOpenProfile}
            className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center text-teal-400 font-bold text-xs uppercase hover:ring-2 hover:ring-teal-500/40 transition-all cursor-pointer"
            aria-label="Open profile"
          >
            {user?.displayName ? user.displayName.charAt(0) : 'U'}
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 sm:px-6 pt-4">
        {/* Search Bar Collapsible */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search destinations, trip titles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-teal-500"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Prominent Next-Up Card (Per PRD section 5 & 10) */}
        {nextUp && (
          <NextUpCard
            plan={nextUp.plan}
            trip={nextUp.trip}
            onPress={() => onSelectTrip(nextUp.trip.id)}
          />
        )}

        {/* Action Header & Primary CTAs */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100">Your Trips</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {trips.length} trip{trips.length !== 1 ? 's' : ''} organized
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Sparkles size={13} className="text-teal-400" />}
              onClick={onImport}
            >
              Import
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={14} />}
              onClick={onNewTrip}
            >
              New Trip
            </Button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-800/80 mb-5 overflow-x-auto no-scrollbar">
          {(['upcoming', 'current', 'past', 'archived'] as FilterTab[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 min-w-[72px] py-1.5 px-3 rounded-lg text-xs font-semibold capitalize transition-all whitespace-nowrap text-center ${
                  isActive
                    ? 'bg-slate-800 text-teal-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Trips List */}
        {filteredTrips.length === 0 ? (
          <EmptyState
            title={activeTab === 'archived' ? 'No archived trips' : 'No trips found'}
            description={
              searchQuery
                ? `No trips match "${searchQuery}".`
                : 'Create your first trip or import a travel confirmation and Dorago will keep everything organized for you.'
            }
            primaryActionLabel="Create Trip"
            onPrimaryAction={onNewTrip}
            secondaryActionLabel="Import Travel Plans"
            onSecondaryAction={onImport}
          />
        ) : (
          <div className="space-y-3.5">
            {filteredTrips.map((trip) => {
              const days = calculateTripDays(trip.startDate, trip.endDate);
              const dateRange = formatTripDateRange(trip.startDate, trip.endDate);

              return (
                <motion.div
                  key={trip.id}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => onSelectTrip(trip.id)}
                  className="group relative overflow-hidden bg-slate-900/85 hover:bg-slate-900 border border-slate-800/90 hover:border-slate-700 rounded-2xl cursor-pointer transition-all duration-200 shadow-sm"
                >
                  {/* Optional Cover Banner */}
                  {trip.coverImageUrl && (
                    <div className="h-28 w-full relative overflow-hidden">
                      <img
                        src={trip.coverImageUrl}
                        alt={trip.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                      <div className="absolute top-3 right-3">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-950/80 backdrop-blur-md text-slate-200 border border-white/10 uppercase tracking-wider">
                          {trip.purpose}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Card Body */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-100 group-hover:text-teal-300 transition-colors">
                          {trip.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <MapPin size={13} className="text-teal-400 shrink-0" />
                          <span>{trip.primaryDestination}</span>
                        </p>
                      </div>

                      <div className="text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all">
                        <ChevronRight size={18} />
                      </div>
                    </div>

                    {/* Stats Footer per PRD Section 10 */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-y-1">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 font-medium text-slate-300">
                          <Calendar size={12} className="text-slate-500" />
                          {dateRange}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span>{days} day{days !== 1 ? 's' : ''}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-teal-400/90 font-medium">
                          <Layers size={12} />
                          {trip.planCount || 0} plan{(trip.planCount || 0) !== 1 ? 's' : ''}
                        </span>
                        {trip.travelerCount > 1 && (
                          <>
                            <span className="text-slate-600">·</span>
                            <span className="flex items-center gap-1">
                              <Users size={12} />
                              {trip.travelerCount}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
